import { controlPoints } from './dom-shared-elements.js';

const basicChangeData = ({ x, y }) => ({ x, y });
const basicFx = (x, y) => ({ cx: x, cy: y });
const xComponent = x => ({ cx: x });
const yComponent = (x, y) => ({ cy: y });
// NOTE: ea of the given cmds has the given number of cps,
// meaning the id of any given cp can be derived by summing the ones before it
// TODO: should this be stored on pathCmds?
// TODO: to add a new cmd, this, text on cmd-select, the part going into mkControlPoint and remControlPoint (could be based on this?!) need to be provided
const amounts = {
    M: 1,
    L: 1,
    H: 1,
    V: 1,
    Q: 2,
    C: 3,
    A: 1,
    S: 2,
    T: 1
};
const getIdOfControlPoint = (layer, id) => layer.points
    .slice(0, id)
    .reduce((cps, point) => cps + amounts[point.cmd], 0);
const getAffectedVAndHCmds = (layer, pointId) => {
    const addOns = [];

    if (layer.points[pointId + 1]) {
        const { cmd } = layer.points[pointId + 1];

        if (cmd === 'V') {
            addOns.push(AffectedControlPoint(
                controlPoints[getIdOfControlPoint(layer, pointId + 1)],
                xComponent
            ));
        } else if (cmd === 'H') {
            addOns.push(AffectedControlPoint(
                controlPoints[getIdOfControlPoint(layer, pointId + 1)],
                yComponent
            ));
        }
    }

    return addOns;
};
const controlPointTypes = {
    regularPoint: ControlPointType(
        basicChangeData,
        (controlPoint, layer, pointId) => {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [AffectedControlPoint(controlPoint, basicFx), ...addOns];
        }
    ),
    hCmd: ControlPointType(
        ({ x }) => ({ x }),
        (controlPoint, layer, pointId) => {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [AffectedControlPoint(controlPoint, xComponent), ...addOns];
        }
    ),
    vCmd: ControlPointType(
        ({ y }) => ({ y }),
        (controlPoint, layer, pointId) => {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [AffectedControlPoint(controlPoint, yComponent), ...addOns];
        }
    ),
    firstControlPoint: ControlPointType(
        ({ x, y }) => ({ x1: x, y1: y }),
        controlPoint => [AffectedControlPoint(controlPoint, basicFx)]
    ),
    secondControlPoint: ControlPointType(
        ({ x, y }) => ({ x2: x, y2: y }),
        controlPoint => [AffectedControlPoint(controlPoint, basicFx)]
    ),
    rectTopLeft: ControlPointType(
        basicChangeData,
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];
            return [
                AffectedControlPoint(controlPoint, basicFx),
                AffectedControlPoint(controlPoints[1],
                    (x, y) => ({ cx: x + point.width, cy: y + point.height }))
            ];
        }
    ),
    rectLowerRight: ControlPointType(
        ({ x, y }, point) => ({
            width: x > point.x ? x - point.x : point.width,
            height: y > point.y ? y - point.y : point.height
        }),
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];
            return [AffectedControlPoint(controlPoint, (x, y) => {
                const cx = (x < point.x) ? point.x : x;
                const cy = (y < point.y) ? point.y : y;
                return { cx, cy };
            })];
        }
    ),
    ellipseCenter: ControlPointType(
        ({ x, y }) => ({ cx: x, cy: y }),
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];
            return [
                AffectedControlPoint(controlPoint, basicFx),
                AffectedControlPoint(controlPoints[1], () => ({ cx: point.cx - point.rx, cy: point.cy })),
                AffectedControlPoint(controlPoints[2], () => ({ cx: point.cx, cy: point.cy - point.ry }))
            ];
        }
    ),
    rx: ControlPointType(
        ({ x }, point) => ({ rx: Math.abs(x - point.cx) }),
        controlPoint => [AffectedControlPoint(controlPoint, xComponent)]
    ),
    ry: ControlPointType(({ y }, point) => ({ ry: Math.abs(y - point.cy) }),
        controlPoint => [AffectedControlPoint(controlPoint, yComponent)])
};

export default controlPointTypes;

/**
 * @param { Function } changeData A function used to change the respective point-data.
 * @param { Function } getAffectedPoints A function returning an array of objects of affected control-points and effects to be applied to them.
 */
function ControlPointType(changeData, getAffectedPoints) { return { changeData, getAffectedPoints }; }

/**
 * @param { SVGCircleElement } cp The control-point affected by dragging.
 * @param { Function } fx The effects applied to the cp.
 */
function AffectedControlPoint(cp, fx) { return { ref: cp, fx }; }