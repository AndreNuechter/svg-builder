import { controlPoints } from './dom-shared-elements.js';

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
const controlPointTypes = {
    regularPoint: ControlPointType(
        basicChangeData,
        (controlPoint, layer, pointId) => {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [{ ref: controlPoint, fx }, ...addOns];
        }
    ),
    hCmd: ControlPointType(
        ({ x }) => ({ x }),
        (controlPoint, layer, pointId) => {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [{ ref: controlPoint, fx: xComponent }, ...addOns];
        }
    ),
    vCmd: ControlPointType(
        ({ y }) => ({ y }),
        (controlPoint, layer, pointId) => {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [{ ref: controlPoint, fx: yComponent }, ...addOns];
        }
    ),
    firstControlPoint: ControlPointType(
        ({ x, y }) => ({ x1: x, y1: y }),
        controlPoint => [{ ref: controlPoint, fx }]
    ),
    secondControlPoint: ControlPointType(
        ({ x, y }) => ({ x2: x, y2: y }),
        controlPoint => [{ ref: controlPoint, fx }]
    ),
    rectTopLeft: ControlPointType(
        basicChangeData,
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];
            return [{
                ref: controlPoint,
                fx
            }, {
                ref: controlPoints[1],
                fx(x, y) {
                    return { cx: x + point.width, cy: y + point.height };
                }
            }];
        }
    ),
    rectLowerRight: ControlPointType(
        ({ x, y }, point) => ({
            width: x > point.x ? x - point.x : point.width,
            height: y > point.y ? y - point.y : point.height
        }),
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];
            return [{
                ref: controlPoint,
                fx(x, y) {
                    const cx = (x < point.x) ? point.x : x;
                    const cy = (y < point.y) ? point.y : y;
                    return { cx, cy };
                }
            }];
        }
    ),
    ellipseCenter: ControlPointType(
        ({ x, y }) => ({ cx: x, cy: y }),
        (controlPoint, layer, pointId) => {
            const point = layer.points[pointId];
            return [{
                ref: controlPoint,
                fx
            }, {
                ref: controlPoints[1],
                fx() {
                    return { cx: point.cx - point.rx, cy: point.cy };
                }
            }, {
                ref: controlPoints[2],
                fx() {
                    return { cx: point.cx, cy: point.cy - point.ry };
                }
            }];
        }
    ),
    rx: ControlPointType(
        ({ x }, point) => ({ rx: Math.abs(x - point.cx) }),
        controlPoint => [{ ref: controlPoint, fx: xComponent }]
    ),
    ry: ControlPointType(({ y }, point) => ({ ry: Math.abs(y - point.cy) }),
        controlPoint => [{ ref: controlPoint, fx: yComponent }])
};

export default controlPointTypes;

// NOTE: The changeData props are functions changing the respective point-data.
// The getAffectedPoints props return an array containing objects pointing to
// affected control-points and effects to be applied to them.
function ControlPointType(changeData, getAffectedPoints) { return { changeData, getAffectedPoints }; }

function getAffectedVAndHCmds(layer, pointId) {
    const addOns = [];

    if (layer.points[pointId + 1]) {
        const { cmd } = layer.points[pointId + 1];

        if (cmd === 'V') {
            addOns.push({
                ref: controlPoints[getIdOfControlPoint(layer, pointId + 1)],
                fx: xComponent
            });
        } else if (cmd === 'H') {
            addOns.push({
                ref: controlPoints[getIdOfControlPoint(layer, pointId + 1)],
                fx: yComponent
            });
        }
    }

    return addOns;
}

function basicChangeData({ x, y }) { return { x, y }; }

function fx(x, y) { return { cx: x, cy: y }; }

function xComponent(x) { return { cx: x }; }

function yComponent(x, y) { return { cy: y }; }

function getIdOfControlPoint(layer, id) {
    return layer.points
        .slice(0, id)
        .reduce((cps, point) => cps + amounts[point.cmd], 0);
}