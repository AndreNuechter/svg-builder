import { pointToMarkup } from './helper-functions.js';

// TODO: verify it makes sense to collect the entries here (session was made redundant)
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

const geometryProps = {
    path(layer) {
        return {
            d: layer.points.map(pointToMarkup).join('') + (layer.style.close ? 'Z' : '')
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
    defaults,
    moves,
    geometryProps
};