/* eslint-disable import/extensions */
import {
    getMinNMax
} from './helper-functions.js';

// moves a layer l/r/u/d when pressing an arrow key
// TODO: the definition is quite opaque. it'd be easier to parse if moves were defined here too
// TODO: cps for dragging are not affected
function move(action, points) {
    points.forEach((p) => {
        p[action[0]] = action[1](p[action[0]]);
        p[action[0] + 1] = action[1](p[action[0] + 1]); // cp1
        p[action[0] + 2] = action[1](p[action[0] + 1]); // cp2
    });
}

function scale(scalar, points) {
    const center = points[0];
    points.forEach((p) => {
        p.x = +(center.x + ((p.x) - center.x) * scalar).toFixed();
        p.y = +(center.y + ((p.y) - center.y) * scalar).toFixed();
    });
}

function rotate(deg, points) {
    const [xMin, yMin, xMax, yMax] = getMinNMax(points);
    const midpoint = [xMin + ((xMax - xMin) / 2), yMin + ((yMax - yMin) / 2)];
    const s = Math.sin(deg * (Math.PI / 180));
    const c = Math.cos(deg * (Math.PI / 180));
    points.forEach((p) => {
        p.x -= midpoint[0];
        p.y -= midpoint[1];
        const xNew = p.x * c - p.y * s;
        const yNew = p.x * s + p.y * c;
        p.x = xNew + midpoint[0];
        p.y = yNew + midpoint[1];
    });
}

function reflect(direction, points) {
    if (['Horizontally', 'Vertically'].indexOf(direction) < 0) return;
    // find midline of shape (x- or y-component of midpoint) and for ea point add dist to midline
    const [xMin, yMin, xMax, yMax] = getMinNMax(points);
    const midpoint = [xMin + ((xMax - xMin) / 2), yMin + ((yMax - yMin) / 2)];
    points.forEach((p) => {
        if (direction === 'Horizontally') p.y += 2 * (midpoint[1] - p.y);
        else p.x += 2 * (midpoint[0] - p.x);
    });
}

function trim(points, config, wElmnt, hElmnt) {
    const [xMin, yMin, xMax, yMax] = getMinNMax(points);
    points.forEach((p) => {
        if (p.x === xMin) p.x = 0;
        else p.x -= xMin;
        if (p.y === yMin) p.y = 0;
        else p.y -= yMin;
    });
    const [width, height] = [Math.ceil(xMax - xMin), Math.ceil(yMax - yMin)];
    config.width = width;
    wElmnt.value = width;
    config.height = height;
    hElmnt.value = height;
}

export {
    move,
    scale,
    rotate,
    reflect,
    trim
};