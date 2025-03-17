import { rotateInputs, scaleInputs, translateInputs } from './dom-selections.js';

const complexTransforms = Object.freeze({
    scale: scaleInputs,
    rotate: rotateInputs,
    translate: translateInputs
});
const defaults = Object.freeze({
    mode: 'path',
    closePath: false,
    outputConfig: Object.freeze({
        width: '180',
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
    })
});

export {
    complexTransforms,
    defaults,
};