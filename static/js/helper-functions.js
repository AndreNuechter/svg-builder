/**
 * Converts a string of hexadecimals into a stringified triplet of integers to be used as RGB values.
 * @param { string } hex The hexadecimal representation to be converted.
 * @returns { string }
 */
function hexToRGB(hex) {
    return hex
        .slice(1) // cut off hash-symbol
        .match(/\w{2}/g) // split into pairs of word-chars (= hex nums)
        .map(e => parseInt(e, 16)) // parse em to base 10
        .join(',');
}

/**
 * Gives the mouse's x- and y-coordinates within the target.
 * @param { HTMLElement } target The element over which the mouse is moving.
 * @param { Event } event The event triggering this (most likely mouseover)
 * @returns { Array }
 */
function getMousePos(target, event) {
    const rect = target.getBoundingClientRect();
    return [
        +(event.clientX - rect.left).toFixed(),
        +(event.clientY - rect.top).toFixed()
    ];
}

/**
 * Turns a single point object into a string that may be inserted into a path's d-attribute.
 * @param { Object } point The point we are trying to draw.
 * @returns { string }
 */
function pointToMarkup(point) {
    const args = [];

    /* eslint-disable */
    switch (point.cmd) {
        case 'H':
            args.push(point.x);
            break;
        case 'V':
            args.push(point.y);
            break;
        case 'A':
            args.push(point.xR,
                point.yR,
                point.xRot,
                point.large,
                point.sweep,
                point.x,
                point.y);
            break;
        case 'Q':
            args.push(point.x1,
                point.y1,
                point.x,
                point.y);
            break;
        case 'C':
            args.push(point.x1,
                point.y1,
                point.x2,
                point.y2,
                point.x,
                point.y);
            break;
        case 'M':
        case 'L':
            args.push(point.x, point.y);
            break;
        default:
            throw Error('WTF!');
    }
    /* eslint-enable */

    return [point.cmd, ...args].join(' ');
}

/**
 * Gives an array of the lowest and highest x- and y-components.
 * @param { Object } points A set of points belonging to a single layer.
 * @returns { Array }
 */
function getMinNMax(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const xMin = Math.min(...xs);
    const yMin = Math.min(...ys);
    const xMax = Math.max(...xs);
    const yMax = Math.max(...ys);
    return [xMin, yMin, xMax, yMax];
}

export {
    hexToRGB,
    getMousePos,
    pointToMarkup,
    getMinNMax
};