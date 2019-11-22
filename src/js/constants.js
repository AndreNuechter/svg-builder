/* globals document */

import { pointToMarkup, inc, dec } from './helper-functions.js';
import { pathCmds } from './commands.js';

const [transformTargeSwitch] = document.getElementsByName('transform-layer-only');
const modes = ['path', 'rect', 'ellipse'];
const cmdTags = Object.keys(pathCmds);

const defaults = {
    dims: {
        width: 320,
        height: 180,
        transforms: {
            translate: [0, 0],
            scale: 1,
            rotate: '0,0,0',
            skewX: 0,
            skewY: 0
        }
    },
    style: {
        strokeColor: '#000000',
        strokeOpacity: 1,
        strokeWidth: 2,
        fillColor: '#000000',
        fillOpacity: 1,
        fillRule: 'evenodd',
        fill: false,
        close: false
    },
    arcCmdConfig: {
        xR: 50,
        yR: 50,
        xRot: 0,
        large: false,
        sweep: false
    },
    session: {
        cmd: 'M',
        arcCmdConfig: {},
        drawingShape: false,
        shapeStart: {},
        reordering: false,
        currentStyle: {}
    }
};

const proxiedSessionKeys = (
    drawing,
    remControlPoints,
    mkControlPoint,
    applyTransforms,
    setArcCmdConfig,
    setFillAndStrokeFields,
    setTransformsFieldset
) => ({
    mode: {
        check(val) { return modes.includes(val); },
        onPass(val) {
            // check the appropriate mode input
            document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
            document.body.className = val;
        }
    },
    cmd: {
        check(val) { return cmdTags.includes(val); },
        onPass(val) {
            // check cmd selector
            document.querySelector(`option[value="${val}"]`).selected = true;
        }
    },
    layer: {
        check(val) { return (+val >= 0 && +val <= drawing.layers.length); },
        onPass(val) {
            remControlPoints();
            if (drawing.layers[val].points.length) {
                drawing.layers[val].points.forEach(mkControlPoint);
            }
            setFillAndStrokeFields(drawing.layers[val].style);
            setArcCmdConfig();
            if (transformTargeSwitch.checked) {
                setTransformsFieldset(drawing.layers[val].transforms || defaults.dims.transforms);
            }
            applyTransforms();
        }
    },
    drawingShape: {
        check(val) { return typeof val === 'boolean'; },
        onPass() {}
    },
    reordering: {
        check(val) { return typeof val === 'boolean'; },
        onPass() {}
    },
    transformLayerNotDrawing: {
        check(val) { return typeof val === 'boolean'; },
        onPass() {}
    }
});

const xComponent = ({ x }) => x;
const yComponent = ({ y }) => y;

// NOTE: ea prop is a name for a control point type. The values are objects where the keys are the affected props of the point object and their values the callbacks to change them in relation to the current cursor position
const controlPointTypes = {
    regularPoint: {
        x: xComponent,
        y: yComponent
    },
    firstControlPoint: {
        x1: xComponent,
        y1: yComponent
    },
    secondControlPoint: {
        x2: xComponent,
        y2: yComponent
    },
    ellipseCenter: {
        cx: xComponent,
        cy: yComponent
    },
    rectLowerRight: {
        width({ x }, point) { return x > point.x ? x - point.x : point.width; },
        height({ y }, point) { return y > point.y ? y - point.y : point.height; }
    },
    ellipseRx: {
        rx({ x }, point) { return Math.abs(x - point.cx); }
    },
    ellipseRy: {
        ry({ y }, point) { return Math.abs(y - point.cy); }
    },
    hCmd: { x: xComponent },
    vCmd: { y: yComponent }
};

const moves = {
    ArrowUp: { prop: 1, cb: dec },
    ArrowDown: { prop: 1, cb: inc },
    ArrowLeft: { prop: 0, cb: dec },
    ArrowRight: { prop: 0, cb: inc }
};

const geometryProps = {
    path(layer) {
        return {
            d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '')
        };
    },
    ellipse({ points: [point] }) {
        return {
            cx: point.cx,
            cy: point.cy,
            rx: point.rx || 0,
            ry: point.ry || 0
        };
    },
    rect({ points: [point] }) {
        return {
            x: point.x,
            y: point.y,
            width: point.width || 0,
            height: point.height || 0
        };
    }
};

export {
    proxiedSessionKeys,
    defaults,
    controlPointTypes,
    moves,
    geometryProps
};