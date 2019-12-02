import { controlPoints } from './dom-shared-elements.js';

// NOTE: ea top-level-prop is a control point type.
// The changeData props are functions changing the respective point-data.
// The getAffectedPoints props return an array containing objects pointing to
// affected control-points and effects to be applied to them.
const controlPointTypes = {
    regularPoint: {
        changeData,
        getAffectedPoints(controlPoint, layer, pointId) {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [{ ref: controlPoint, fx }, ...addOns];
        }
    },
    hCmd: {
        changeData({ x }) { return { x }; },
        getAffectedPoints(controlPoint, layer, pointId) {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [{ ref: controlPoint, fx: xComponent }, ...addOns];
        }
    },
    vCmd: {
        changeData({ y }) { return { y }; },
        getAffectedPoints(controlPoint, layer, pointId) {
            const addOns = getAffectedVAndHCmds(layer, pointId);
            return [{ ref: controlPoint, fx: yComponent }, ...addOns];
        }
    },
    firstControlPoint: {
        changeData({ x, y }) { return { x1: x, y1: y }; },
        getAffectedPoints(controlPoint) {
            return [{ ref: controlPoint, fx }];
        }
    },
    secondControlPoint: {
        changeData({ x, y }) { return { x2: x, y2: y }; },
        getAffectedPoints(controlPoint) {
            return [{ ref: controlPoint, fx }];
        }
    },
    rectTopLeft: {
        changeData,
        getAffectedPoints(controlPoint, layer, pointId) {
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
    },
    rectLowerRight: {
        changeData({ x, y }, point) {
            return {
                width: x > point.x ? x - point.x : point.width,
                height: y > point.y ? y - point.y : point.height
            };
        },
        getAffectedPoints(controlPoint, layer, pointId) {
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
    },
    ellipseCenter: {
        changeData({ x, y }) {
            return { cx: x, cy: y };
        },
        getAffectedPoints(controlPoint, layer, pointId) {
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
    },
    ellipseRx: {
        changeData({ x }, point) { return { rx: Math.abs(x - point.cx) }; },
        getAffectedPoints(controlPoint) {
            return [{ ref: controlPoint, fx: xComponent }];
        }
    },
    ellipseRy: {
        changeData({ y }, point) { return { ry: Math.abs(y - point.cy) }; },
        getAffectedPoints(controlPoint) {
            return [{ ref: controlPoint, fx: yComponent }];
        }
    }
};

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

function changeData({ x, y }) {
    return { x, y };
}

function fx(x, y) {
    return { cx: x, cy: y };
}

function xComponent(x) {
    return { cx: x };
}

function yComponent(x, y) {
    return { cy: y };
}

// NOTE: ea of the given cmds has the given number of cps,
// meaning the id of any given cp can be derived by summing the ones before it
const amounts = { // TODO: pathCmds...text on cmd-select too...the part going into mkControlPoint feels redundant as well...remControlPoint too
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

function getIdOfControlPoint(layer, id) {
    return layer.points
        .slice(0, id)
        .reduce((cps, point) => cps + amounts[point.cmd], 0);
}

export default controlPointTypes;