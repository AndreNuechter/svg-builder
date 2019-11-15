/* globals document */

import { pointToMarkup, inc, dec } from './helper-functions.js';

const modes = ['path', 'rect', 'ellipse'];
const closeToggle = document.getElementById('close-toggle');
const arcCmdConfig = document.getElementById('arc-cmd-config');
const commands = document.getElementById('commands');

const cmds = ['M', 'L', 'H', 'V', 'Q', 'C', 'A'];

const proxiedSessionKeys = (
    drawing,
    remControlPoints,
    mkControlPoint,
    applyTransforms,
    setArcCmdConfig,
    setFillAndStrokeFields
) => ({
    mode: {
        check(val) { return modes.includes(val); },
        onPass(val) {
            // check the appropriate mode input
            document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
            // show/hide cmds depending on mode
            commands.style.display = (val === 'path') ? 'block' : 'none';
            // same for a cmd config
            arcCmdConfig.style.display = (val === 'path') ? 'inline-grid' : 'none';
            // disable checkbox for closing shape when not in path mode
            closeToggle.disabled = (val !== 'path');
        }
    },
    cmd: {
        check(val) { return cmds.includes(val); },
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
            applyTransforms();
            // TODO: sync transform fieldset on layer switch: if we changed to transforming single layer, set fieldset to the config of the new layer
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
    cmds,
    geometryProps
};