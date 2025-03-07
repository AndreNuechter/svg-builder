import { controlPoints } from '../dom-selections.js';

// NOTE: ea cmd has the given number of cps, so the id of any given cp can be derived by summing the ones before it
const cpCountPerCmd = {
    M: 1,
    L: 1,
    H: 1,
    V: 1,
    Q: 2,
    C: 3,
    A: 1,
    S: 2,
    T: 1,
};
const controlPointTypes = {
    regularPoint: ControlPointType(
        'control-point__regular',
        updateXAndYComponents,
        (controlPoint, layer, pointId) => {
            return [
                AffectedControlPoint(controlPoint, updateCxAndCyComponents),
                ...getAffectedVAndHCmds(layer, pointId)
            ];
        },
    ),
    hCmd: ControlPointType(
        'control-point__h',
        ({ x }) => ({ x }),
        (controlPoint, layer, pointId) => {
            return [
                AffectedControlPoint(controlPoint, updateCxComponent),
                ...getAffectedVAndHCmds(layer, pointId)
            ];
        },
    ),
    vCmd: ControlPointType(
        'control-point__v',
        ({ y }) => ({ y }),
        (controlPoint, layer, pointId) => {
            return [
                AffectedControlPoint(controlPoint, updateCyComponent),
                ...getAffectedVAndHCmds(layer, pointId)
            ];
        },
    ),
    firstControlPoint: ControlPointType(
        'control-point__a',
        ({ x, y }) => ({ x1: x, y1: y }),
        (controlPoint) => [AffectedControlPoint(controlPoint, updateCxAndCyComponents)],
    ),
    secondControlPoint: ControlPointType(
        'control-point__b',
        ({ x, y }) => ({ x2: x, y2: y }),
        (controlPoint) => [AffectedControlPoint(controlPoint, updateCxAndCyComponents)],
    ),
    rectTopLeft: ControlPointType(
        'control-point__rect-top-left',
        updateXAndYComponents,
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];

            return [
                AffectedControlPoint(controlPoint, updateCxAndCyComponents),
                AffectedControlPoint(
                    controlPoints[1],
                    (x, y) => ({ cx: x + point.width, cy: y + point.height })
                ),
            ];
        },
    ),
    rectBottomRight: ControlPointType(
        'control-point__rect-bottom-right',
        ({ x, y }, point) => ({
            width: x > point.x ? x - point.x : point.width,
            height: y > point.y ? y - point.y : point.height,
        }),
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];

            return [AffectedControlPoint(controlPoint, (x, y) => {
                const cx = (x < point.x) ? point.x : x;
                const cy = (y < point.y) ? point.y : y;

                return { cx, cy };
            })];
        },
    ),
    ellipseCenter: ControlPointType(
        'control-point__ellipse-center',
        ({ x, y }) => ({ cx: x, cy: y }),
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];

            return [
                AffectedControlPoint(controlPoint, updateCxAndCyComponents),
                AffectedControlPoint(controlPoints[1], () => ({ cx: point.cx - point.rx, cy: point.cy })),
                AffectedControlPoint(controlPoints[2], () => ({ cx: point.cx, cy: point.cy - point.ry })),
            ];
        },
    ),
    rx: ControlPointType(
        'control-point__ellipse-rx',
        ({ x }, point) => ({ rx: Math.abs(x - point.cx) }),
        (controlPoint) => [AffectedControlPoint(controlPoint, updateCxComponent)],
    ),
    ry: ControlPointType(
        'control-point__ellipse-ry',
        ({ y }, point) => ({ ry: Math.abs(y - point.cy) }),
        (controlPoint) => [AffectedControlPoint(controlPoint, updateCyComponent)],
    ),
};

export default controlPointTypes;
export { cpCountPerCmd };

/**
 * @param { SVGCircleElement } ref The affected cp element.
 * @param { Function } fx The effect(s) applied to the cp.
 */
function AffectedControlPoint(ref, fx) {
    return { ref, fx };
}

/**
 * @param { String } CSSClass The CSS-class applied to an instance of this type.
 * @param { Function } changeData A function changing the related point-data when a cp of this type is dragged.
 * @param { Function } getAffectedPoints A function returning an array of control-points affected by dragging a cp of this type.
 */
function ControlPointType(CSSClass, changeData, getAffectedPoints) {
    return { CSSClass, changeData, getAffectedPoints };
}

function getAffectedVAndHCmds(layer, pointId) {
    const affectedCmds = [];
    const idOfNextPoint = pointId + 1;

    if (layer.points[idOfNextPoint]) {
        const { cmd } = layer.points[idOfNextPoint];

        if (cmd === 'V') {
            affectedCmds.push(
                AffectedControlPoint(
                    controlPoints[getIdOfControlPoint(layer, idOfNextPoint)],
                    updateCxComponent,
                )
            );
        } else if (cmd === 'H') {
            affectedCmds.push(
                AffectedControlPoint(
                    controlPoints[getIdOfControlPoint(layer, idOfNextPoint)],
                    updateCyComponent,
                )
            );
        }
    }

    return affectedCmds;
}

function getIdOfControlPoint(layer, id) {
    return layer.points
        .slice(0, id)
        .reduce((cps, point) => cps + cpCountPerCmd[point.cmd], 0);
}

function updateCxComponent(cx) {
    return { cx };
}

function updateCyComponent(_, cy) {
    return { cy };
}

function updateCxAndCyComponents(cx, cy) {
    return { cx, cy };
}

function updateXAndYComponents({ x, y }) {
    return { x, y };
}