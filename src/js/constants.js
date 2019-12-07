const defaults = {
    dims: {
        width: 320,
        height: 180,
        'padding-top': 0,
        'padding-right': 0,
        'padding-bottom': 0,
        'padding-left': 0,
        ratio: 'xMidYMid',
        'slice-or-meet': 'meet'
    },
    transforms: {
        translate: [0, 0],
        scale: 1,
        rotate: '0,0,0',
        skewX: 0,
        skewY: 0
    },
    style: {
        strokeColor: '#000000',
        strokeOpacity: 1,
        strokeWidth: 2,
        fillColor: '#000000',
        fillOpacity: 1,
        fill: false,
        close: false
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
    defaults,
    moves
};