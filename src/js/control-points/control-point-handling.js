import { circleTemplate, lineTemplate } from '../dom-created-elements.js';
import { controlPoints, controlPointContainer, slopes, svg } from '../dom-shared-elements.js';
import {
    configClone,
    configElement,
    getSVGCoords,
    last,
    lastId,
} from '../helper-functions.js';
import { drawLayer } from '../layers/layer-handling.js';
import drawing, { save } from '../drawing/drawing.js';
import controlPointTypes from './control-point-types.js';

const {
    regularPoint,
    hCmd,
    vCmd,
    firstControlPoint,
    secondControlPoint,
    rectTopLeft,
    rectLowerRight,
    ellipseCenter,
    rx,
    ry,
} = controlPointTypes;
const slopeObserverOptions = { attributes: true, attributeFilter: ['cx', 'cy'] };

export {
    createControlPoints,
    remLastControlPoint,
    remControlPoints,
    mkControlPoint,
};

function stopDragging() {
    Object.assign(svg, {
        onpointermove: null,
        onpointerleave: null,
        onpointerup: null,
    });
    save('dragging');
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
    };
}

function mkSlope(x1, y1, x2, y2, startPoint, endPoint) {
    const slope = configClone(lineTemplate)({ x1, y1, x2, y2 });
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
        .forEach((point, pointId) => mkControlPoint(
            activeLayer,
            layerId,
            point,
            pointId)
        );
}

/**
 * Adds all the controlpoints associated with an addition to a layer.
 * @param { object } layer The layer the new controlpoint belongs to.
 * @param { number } layerId The index of that layer.
 * @param { object } point The point being added to the layer.
 * @param { number } pointId The index of that point.
 */
function mkControlPoint(layer, layerId, point, pointId) {
    const addedControlPoints = [];

    // we branch based on the mode, which we tell by duck-typing:
    // cmd-prop implies path, 'width' rect and 'cx' ellipse
    if ('cmd' in point) {
        if (['M', 'L', 'Q', 'C', 'A', 'S', 'T'].includes(point.cmd)) {
            const mainCP = ControlPoint(point.x, point.y, pointId, regularPoint, layerId);
            if (['Q', 'C', 'S'].includes(point.cmd)) {
                const previousPoint = layer.points[pointId - 1];
                const firstCP = ControlPoint(
                    point.x1,
                    point.y1,
                    pointId,
                    firstControlPoint,
                    layerId,
                );

                addedControlPoints.push(firstCP);

                if (point.cmd !== 'S') {
                    addedControlPoints.push(mkSlope(
                        point.x1,
                        point.y1,
                        previousPoint.x,
                        previousPoint.y,
                        firstCP,
                        last(controlPoints),
                    ));
                }

                if (point.cmd === 'C') {
                    const secondCP = ControlPoint(
                        point.x2,
                        point.y2,
                        pointId,
                        secondControlPoint,
                        layerId,
                    );
                    addedControlPoints.push(secondCP, mkSlope(point.x, point.y, point.x2, point.y2, mainCP, secondCP));
                }

                if (['Q', 'S'].includes(point.cmd)) {
                    addedControlPoints.push(mkSlope(point.x, point.y, point.x1, point.y1, mainCP, firstCP));
                }
            }
            // NOTE: this cp is only pushed now to have it be last, which is important for the slopes
            addedControlPoints.push(mainCP);
        } else if (point.cmd === 'H') {
            addedControlPoints.push(
                ControlPoint(point.x, layer.points[pointId - 1].y, pointId, hCmd, layerId),
            );
        } else if (point.cmd === 'V') {
            addedControlPoints.push(
                ControlPoint(layer.points[pointId - 1].x, point.y, pointId, vCmd, layerId),
            );
        }
    } else if ('width' in point) {
        addedControlPoints.push(
            ControlPoint(point.x, point.y, pointId, rectTopLeft, layerId),
            ControlPoint(point.x + point.width, point.y + point.height, pointId, rectLowerRight, layerId),
        );
    } else if ('cx' in point) {
        addedControlPoints.push(
            ControlPoint(point.cx, point.cy, pointId, ellipseCenter, layerId),
            ControlPoint(point.cx - point.rx, point.cy, pointId, rx, layerId),
            ControlPoint(point.cx, point.cy - point.ry, pointId, ry, layerId),
        );
    }

    // NOTE: we dont add these elements to the drawingContent to keep em out of the final markup
    controlPointContainer.append(...addedControlPoints);
}

/**
 * Removes the control point(s) and possibly slope(s) of the last point of a path.
 * @param { string } cmd The command of the removed point.
 */
function remLastControlPoint(cmd) {
    controlPoints[lastId(controlPoints)].remove();

    if (['Q', 'C', 'S'].includes(cmd)) {
        const slopeCount = cmd === 'S' ? 1 : 2;

        for (let i = 0; i < slopeCount; i += 1) {
            slopes[lastId(slopes)].remove();
        }

        controlPoints[lastId(controlPoints)].remove();

        if (cmd === 'C') {
            controlPoints[lastId(controlPoints)].remove();
        }
    }
}

function remControlPoints() {
    controlPointContainer.replaceChildren();
}