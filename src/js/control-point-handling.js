import { drawing } from './drawing.js';
import { circleTemplate } from './dom-created-elements.js';
import { controlPoints, controlPointContainer, svg } from './dom-shared-elements.js';
import controlPointTypes from './control-point-types.js';
import { configClone, configElement, getSVGCoords } from './helper-functions.js';
import { drawLayer } from './layer-handling.js';

const {
    regularPoint,
    hCmd,
    vCmd,
    firstControlPoint,
    secondControlPoint,
    rectTopLeft,
    rectLowerRight,
    ellipseCenter,
    ellipseRx,
    ellipseRy
} = controlPointTypes;
const stopDragging = () => {
    svg.onmousemove = null;
    svg.onmouseleave = null;
    svg.onmouseup = null;
};
const startDragging = (layer, pointId, controlPointType, cp) => (e) => {
    // prevent triggering svg.onmousedown
    e.stopPropagation();
    svg.onmousemove = dragging(layer, pointId, controlPointType, cp);
    svg.onmouseleave = stopDragging;
    svg.onmouseup = stopDragging;
};

/**
 * Removes the control point(s) of the last point added to a path-layer.
 * @param { string } cmd The command of the removed point.
 */
function remLastControlPoint(cmd) {
    controlPoints[controlPoints.length - 1].remove();
    if (cmd === 'Q' || cmd === 'C') controlPoints[controlPoints.length - 1].remove();
    if (cmd === 'C') controlPoints[controlPoints.length - 1].remove();
}

/**
 * Removes all control points of the active layer.
 */
function remControlPoints() {
    [...controlPoints].forEach(c => c.remove());
}

/**
 * The interface for control point creation.
 * @param { number } layerId The ordinal of the layer the controlled point belongs to.
 * @returns { Function } A function creating and appending the control point(s) for the given point.
 */
function mkControlPoint(layerId) {
    return (point, pointId) => {
        const cps = [];

        if (point.cmd) {
            if (['M', 'L', 'Q', 'C', 'A'].includes(point.cmd)) {
                cps.push(ControlPoint(point.x, point.y, pointId, regularPoint, layerId));
            } else if (point.cmd === 'H') {
                cps.push(ControlPoint(point.x, layerId.points[pointId - 1].y, pointId, hCmd, layerId));
            } else if (point.cmd === 'V') {
                cps.push(ControlPoint(layerId.points[pointId - 1].x, point.y, pointId, vCmd, layerId));
            }

            if (point.cmd === 'Q' || point.cmd === 'C') {
                cps.push(ControlPoint(point.x1, point.y1, pointId, firstControlPoint, layerId));
            }

            if (point.cmd === 'C') {
                cps.push(ControlPoint(point.x2, point.y2, pointId, secondControlPoint, layerId));
            }
            // eslint-disable-next-line no-prototype-builtins
        } else if (point.hasOwnProperty('width')) {
            cps.push(ControlPoint(point.x, point.y, pointId, rectTopLeft, layerId),
                ControlPoint(point.x + point.width, point.y + point.height, pointId, rectLowerRight, layerId));
            // eslint-disable-next-line no-prototype-builtins
        } else if (point.hasOwnProperty('cx')) {
            cps.push(ControlPoint(point.cx, point.cy, pointId, ellipseCenter, layerId),
                ControlPoint(point.cx - point.rx, point.cy, pointId, ellipseRx, layerId),
                ControlPoint(point.cx, point.cy - point.ry, pointId, ellipseRy, layerId));
        }

        // NOTE: we dont add the cps to the drawingContent to keep em out of the markup
        controlPointContainer.append(...cps);
    };
}

/**
 * Constructs a single draggable point to control some prop(s) of the active layer.
 * @param { number } x The x-ccordinate of the cp.
 * @param { number } y The y-ccordinate of the cp.
 * @param { number } pointId The ordinal number of the point within its layer.
 * @param { Object } controlPointType the type of cp we want to create.
 * @param { number } layerId The ordinal of the layer the controlled point belongs to.
 */
function ControlPoint(x, y, pointId, controlPointType, layerId) {
    const cp = configClone(circleTemplate)({ cx: x, cy: y });

    cp.onmousedown = startDragging(layerId, pointId, controlPointType, cp);
    cp.onmouseup = stopDragging;

    return cp;
}

/**
 * The eventHandler-factory for a draggable control point (cp).
 * @param { number } layerId The ordinal of the layer-data the dragged cp affects.
 * @param { number } pointId The ordinal number of the point within layer the dragged cp belongs to.
 * @param { Object } controlPointType The "type" of cp we're dealing with.
 * @param { SVGCircleElement } controlPoint The cp that's to be dragged.
 * @returns { Function } The event-handler to be executed when dragging the cp.
 */
function dragging(layerId, pointId, controlPointType, controlPoint) {
    const layer = drawing.layers[layerId];
    const point = layer.points[pointId];
    const { changeData } = controlPointType;
    const affectedControlPoints = controlPointType.getAffectedPoints(controlPoint, layer, pointId);

    return (e) => {
        const [x, y] = getSVGCoords(e);
        // change point-data, update layer and move affected cps
        Object.assign(point, changeData({ x, y }, point));
        drawLayer(layerId);
        affectedControlPoints.forEach(({ ref, fx }) => configElement(ref, fx(x, y)));
    };
}

export {
    remLastControlPoint,
    remControlPoints,
    mkControlPoint
};