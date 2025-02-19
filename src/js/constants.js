import { rotateInputs, scaleInputs } from './dom-shared-elements.js';
import { pathCmds } from './layers/path-commands.js';

const cmdTags = new Set(Object.keys(pathCmds));
const complexTransforms = Object.freeze({
    scale: scaleInputs,
    rotate: rotateInputs,
});
const defaults = Object.freeze({
    mode: 'path',
    closePath: false,
    outputConfig: Object.freeze({
        width: '320',
        height: '180',
        'vb-min-x': '0',
        'vb-min-y': '0',
        'vb-width': '0',
        'vb-height': '0',
        ratio: 'xMidYMid',
        'slice-or-meet': 'meet',
        'file-format': 'svg',
    }),
    transforms: Object.freeze({
        translate: Object.freeze(['0', '0']),
        scale: Object.freeze(['1', '1']),
        rotate: Object.freeze(['0', '0', '0']),
        skewX: '0',
        skewY: '0',
    }),
    style: Object.freeze({
        stroke: '#000',
        'stroke-opacity': '1',
        'stroke-width': '2',
        fill: '#000',
        'fill-opacity': '0',
        'stroke-linecap': 'butt',
        'stroke-linejoin': 'arcs',
        'stroke-miterlimit': '1',
        'fill-rule': 'evenodd',
    }),
    styleRelevancies: Object.freeze({
        'stroke-linecap': 'path',
        'stroke-linejoin': 'path,rect',
        'stroke-miterlimit': 'path,rect',
        'fill-rule': 'path',
    }),
    arcCmdConfig: Object.freeze({
        xR: '50',
        yR: '50',
        xRot: '0',
        large: false,
        sweep: false,
    }),
});
const inc = (num) => num + 1;
const dec = (num) => num - 1;
const moves = Object.freeze({
    ArrowUp: Object.freeze({ prop: 1, cb: dec }),
    ArrowDown: Object.freeze({ prop: 1, cb: inc }),
    ArrowLeft: Object.freeze({ prop: 0, cb: dec }),
    ArrowRight: Object.freeze({ prop: 0, cb: inc }),
});
const backgroundGridStepsize = 5;

export {
    backgroundGridStepsize,
    cmdTags,
    complexTransforms,
    defaults,
    moves,
};