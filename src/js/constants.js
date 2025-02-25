import { rotateInputs, scaleInputs } from './dom-selections.js';

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
        // NOTE: translate is made up of numbers instead of strs like the other transforms as these values are changed via the `moves` obj from below
        translate: Object.freeze([0, 0]),
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
    })
});
const inc = (num) => num + 1;
const dec = (num) => num - 1;
const moves = Object.freeze({
    ARROWUP: Object.freeze({ affectedAxis: 1, translation: dec }),
    ARROWDOWN: Object.freeze({ affectedAxis: 1, translation: inc }),
    ARROWLEFT: Object.freeze({ affectedAxis: 0, translation: dec }),
    ARROWRIGHT: Object.freeze({ affectedAxis: 0, translation: inc }),
});
const backgroundGridStepsize = 5;

export {
    backgroundGridStepsize,
    complexTransforms,
    defaults,
    moves,
};