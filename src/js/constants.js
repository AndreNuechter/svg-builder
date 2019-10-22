/* globals document */

import { inc, dec } from './helper-functions.js';

const modes = ['path', 'rect', 'ellipse'];
const closeToggle = document.getElementById('close-toggle');

const proxiedSessionKeys = (
    commands,
    aCmdConfig,
    cmds,
    drawing,
    remControlPoints,
    mkControlPoint,
    setFillAndStrokeFields
) => ({
    mode: {
        check(val) { return modes.includes(val); },
        onPass(val) {
            // check the appropriate mode input
            document.querySelector(`input[type="radio"][value="${val}"]`)
                .checked = true;
            // show/hide cmds depending on mode
            commands.style.display = val === 'path' ? 'block' : 'none';
            // same for a cmd config
            aCmdConfig.style.display = val === 'path' ? 'block' : 'none';
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
            // rem cps of prev layer
            remControlPoints();
            // add cps for curr layer
            if (drawing.layers[val].points.length) {
                drawing.layers[val].points.forEach(mkControlPoint);
            }
            // adjust Fill & Stroke
            setFillAndStrokeFields(drawing.layers[val].style);
        }
    },
    drawingShape: {
        check(val) { return typeof val === 'boolean'; },
        onPass() {}
    },
    reordering: {
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
            rotate: 0,
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
    session: {
        cmd: 'M',
        arcCmdConfig: {
            xR: 50,
            yR: 50,
            xRot: 0,
            large: false,
            sweep: false
        },
        drawingShape: false,
        shapeStart: {},
        reordering: false
    }
};

const xComponent = ({ x }) => x;
const yComponent = ({ y }) => y;

// NOTE: ea prop is a name for a cp. The values are objects where the keys are the affected props of the point object and their values the callbacks to change them in relation to the current cursor position
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
    rectLowerRight: { // TODO prevent movement above point.y or left of point.x
        width({ x }, point) { return Math.abs(x - point.x); },
        height({ y }, point) { return Math.abs(y - point.y); }
    },
    ellipseRx: {
        rx({ x }, point) { return Math.abs(x - point.cx); }
    },
    ellipseRy: {
        ry({ y }, point) { return Math.abs(y - point.cy); }
    }
};

const moves = {
    ArrowUp: [
        ['y', 'y1', 'y2', 'cy'], dec
    ],
    ArrowDown: [
        ['y', 'y1', 'y2', 'cy'], inc
    ],
    ArrowLeft: [
        ['x', 'x1', 'x2', 'cx'], dec
    ],
    ArrowRight: [
        ['x', 'x1', 'x2', 'cx'], inc
    ]
};

export {
    proxiedSessionKeys,
    defaults,
    controlPointTypes,
    moves
};