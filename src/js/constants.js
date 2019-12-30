import { rotateInputs, scaleInputs } from './dom-shared-elements.js';
import { pathCmds } from './path-commands.js';

const cmdTags = Object.keys(pathCmds);
const complexTransforms = {
    scale: scaleInputs,
    rotate: rotateInputs
};
const defaults = {
    mode: 'path',
    closePath: false,
    outputConfig: {
        width: 320,
        height: 180,
        'vb-min-x': 0,
        'vb-min-y': 0,
        'vb-width': 0,
        'vb-height': 0,
        ratio: 'xMidYMid',
        'slice-or-meet': 'meet',
        'file-format': 'svg'
    },
    transforms: {
        translate: [0, 0],
        scale: [1, 1],
        rotate: [0, 0, 0],
        skewX: 0,
        skewY: 0
    },
    style: {
        stroke: '#000',
        'stroke-opacity': 1,
        'stroke-width': 2,
        fill: 'none',
        'fill-opacity': 1
    },
    arcCmdConfig: {
        xR: 50,
        yR: 50,
        xRot: 0,
        large: false,
        sweep: false
    }
};
const inc = num => num + 1;
const dec = num => num - 1;
const moves = {
    ArrowUp: { prop: 1, cb: dec },
    ArrowDown: { prop: 1, cb: inc },
    ArrowLeft: { prop: 0, cb: dec },
    ArrowRight: { prop: 0, cb: inc }
};

export {
    cmdTags,
    complexTransforms,
    defaults,
    moves
};