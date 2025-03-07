import { circleTemplate, lineTemplate } from '../dom-creations.js';
import { controlPoints, controlPointContainer, slopes, svg } from '../dom-selections.js';
import {
    configClone,
    configElement,
    getSVGCoords,
    last,
} from '../helper-functions.js';
import { drawLayer } from '../layers/layer-handling.js';
import drawing, { save } from '../drawing/drawing.js';
import controlPointTypes from './control-point-types.js';
import { setActiveLayerConfig } from '../layers/active-layer-config.js';

const {
    regularPoint,
    hCmd,
    vCmd,
    firstControlPoint,
    secondControlPoint,
    rectTopLeft,
    rectBottomRight,
    ellipseCenter,
    rx,
    ry,
} = controlPointTypes;
const slopeObserverOptions = { attributes: true, attributeFilter: ['cx', 'cy'] };
const cmdsWithRegularCp = new Set(['M', 'L', 'Q', 'C', 'A', 'S', 'T']);
const cmdsWithFirstCp = new Set(['Q', 'C', 'S']);
const cmdsWithSlopeBetweenMainAndFirstCp = new Set(['Q', 'S']);

export {
    createControlPoints,
    mkControlPoints,
    remControlPoints,
    remLastControlPoint,
    updateControlPoints
};

function stopDragging() {
    save('dragging');
    Object.assign(svg, {
        onpointermove: null,
        onpointerleave: null,
        onpointerup: null,
    });
    svg.classList.remove('dragging-a-cp');
    setActiveLayerConfig();
}

/** A factory creating pointerdown event-handlers enabling dragging a controlpoint. */
function startDragging(layer, pointId, controlPointType) {
    return (event) => {
        // NOTE: prevent triggering svg.onpointerdown which would create a new point
        event.stopPropagation();
        // the actual dragging happens via pointermove on the canvas
        Object.assign(svg, {
            onpointermove: dragging(layer, pointId, controlPointType, event.target),
            onpointerleave: stopDragging,
            onpointerup: stopDragging,
        });
        svg.classList.add('dragging-a-cp');
    };
}

function mkSlope(startPoint, endPoint) {
    const slope = configClone(lineTemplate)(
        {
            x1: startPoint.getAttribute('cx'),
            y1: startPoint.getAttribute('cy'),
            x2: endPoint.getAttribute('cx'),
            y2: endPoint.getAttribute('cy')
        }
    );
    const startPointObserver = new MutationObserver(() => {
        slope.setAttribute('x1', startPoint.getAttribute('cx'));
        slope.setAttribute('y1', startPoint.getAttribute('cy'));
    });
    const endPointObserver = new MutationObserver(() => {
        slope.setAttribute('x2', endPoint.getAttribute('cx'));
        slope.setAttribute('y2', endPoint.getAttribute('cy'));
    });

    startPointObserver.observe(startPoint, slopeObserverOptions);
    endPointObserver.observe(endPoint, slopeObserverOptions);

    return slope;
}

/**
 * Constructs a single draggable point to control some prop(s) of the active layer.
 * @param { number } x The x-coordinate of the cp.
 * @param { number } y The y-coordinate of the cp.
 * @param { number } pointId The ordinal of the point within its layer.
 * @param { ControlPointType } controlPointType the type of cp we want to create.
 * @param { number } layerId The ordinal of the layer the controlled point belongs to.
 * @returns { SVGCircleElement } A preconfigured cp.
 */
function ControlPoint(cx, cy, pointId, controlPointType, layerId) {
    return configClone(circleTemplate)({
        class: `control-point ${controlPointType.CSSClass}`,
        cx,
        cy,
        onpointerdown: startDragging(layerId, pointId, controlPointType),
    });
}

/**
 * A factory for creating pointermove-handlers enabling dragging a controlpoint.
 * The canvas will use the returned function to change the position of the cp and adjust the drawing.
 * @param { number } layerId The ordinal of the layer-data the dragged cp affects.
 * @param { number } pointId The ordinal of the point within the layer the dragged cp belongs to.
 * @param { Object } controlPointType The type of cp we're dealing with.
 * @param { SVGCircleElement } controlPoint The cp to be dragged.
 * @returns { Function } The event-handler to be executed when dragging the cp.
 */
function dragging(layerId, pointId, controlPointType, controlPoint) {
    const layer = drawing.layers[layerId];
    const point = layer.points[pointId];
    const { changeData } = controlPointType;
    // TODO cant this be calculated once when the point is created in ControlPoint() instead of on ea pointerdown?
    const affectedControlPoints = controlPointType.getAffectedPoints(controlPoint, layer, pointId);

    return (event) => {
        const [x, y] = getSVGCoords(event);
        // change the point-data
        Object.assign(point, changeData({ x, y }, point));
        // draw the updated layer
        drawLayer(layerId);
        // mv affected cps
        affectedControlPoints.forEach(({ ref, fx }) => configElement(ref, fx(x, y)));
    };
}

/** Draws all controlpoints of to the active layer. */
function createControlPoints({ activeLayer, layerId }) {
    activeLayer?.points
        .forEach((point, pointId) =>
            mkControlPoints(
                activeLayer,
                layerId,
                point,
                pointId
            )
        );
}

/**
 * Adds all the controlpoints associated with a layers point.
 * @param { object } layer The layer the new controlpoint belongs to.
 * @param { number } layerId The index of that layer.
 * @param { object } point The point being added to the layer.
 * @param { number } pointId The index of that point.
 */
function mkControlPoints(layer, layerId, point, pointId) {
    const addedControlPointsAndSlopes = [];

    // we branch based on the mode, which we tell by duck-typing:
    // the cmd-prop implies path, 'width' rect and 'cx' ellipse
    if ('cmd' in point) {
        if (cmdsWithRegularCp.has(point.cmd)) {
            const mainCP = ControlPoint(point.x, point.y, pointId, regularPoint, layerId);

            if (cmdsWithFirstCp.has(point.cmd)) {
                const firstCP = ControlPoint(
                    point.x1,
                    point.y1,
                    pointId,
                    firstControlPoint,
                    layerId,
                );

                addedControlPointsAndSlopes.push(firstCP);

                if (point.cmd !== 'S') {
                    // TODO should S have two slopes as well?
                    addedControlPointsAndSlopes.push(mkSlope(firstCP, last(controlPoints)));
                }

                if (point.cmd === 'C') {
                    const secondCP = ControlPoint(
                        point.x2,
                        point.y2,
                        pointId,
                        secondControlPoint,
                        layerId,
                    );

                    addedControlPointsAndSlopes.push(secondCP, mkSlope(mainCP, secondCP));
                }

                if (cmdsWithSlopeBetweenMainAndFirstCp.has(point.cmd)) {
                    addedControlPointsAndSlopes.push(mkSlope(mainCP, firstCP));
                }
            }

            // NOTE: we only push this cp now so it's the last one, which is important for the slopes
            addedControlPointsAndSlopes.push(mainCP);
        } else if (point.cmd === 'H') {
            addedControlPointsAndSlopes.push(
                ControlPoint(point.x, layer.points[pointId - 1].y, pointId, hCmd, layerId),
            );
        } else if (point.cmd === 'V') {
            addedControlPointsAndSlopes.push(
                ControlPoint(layer.points[pointId - 1].x, point.y, pointId, vCmd, layerId),
            );
        }
    } else if ('width' in point) {
        addedControlPointsAndSlopes.push(
            ControlPoint(point.x, point.y, pointId, rectTopLeft, layerId),
            ControlPoint(point.x + point.width, point.y + point.height, pointId, rectBottomRight, layerId),
        );
    } else if ('cx' in point) {
        addedControlPointsAndSlopes.push(
            ControlPoint(point.cx, point.cy, pointId, ellipseCenter, layerId),
            ControlPoint(point.cx - point.rx, point.cy, pointId, rx, layerId),
            ControlPoint(point.cx, point.cy - point.ry, pointId, ry, layerId),
        );
    }

    // NOTE: we dont add these elements to the drawingContent to keep em out of the final markup
    controlPointContainer.append(...addedControlPointsAndSlopes);
}

/**
 * Removes the control point(s) and possibly slope(s) of the last point of a path.
 * @param { string } cmd The command of the removed point.
 */
function remLastControlPoint(cmd) {
    last(controlPoints).remove();

    if (cmdsWithFirstCp.has(cmd)) {
        const slopeCount = cmd === 'S' ? 1 : 2;

        for (let i = 0; i < slopeCount; i += 1) {
            last(slopes).remove();
        }

        last(controlPoints).remove();

        if (cmd === 'C') {
            last(controlPoints).remove();
        }
    }
}

function remControlPoints() {
    controlPointContainer.replaceChildren();
}

function updateControlPoints(session) {
    remControlPoints();
    createControlPoints(session);
}