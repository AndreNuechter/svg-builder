function hexToRGB(hex) {
    return hex
        .slice(1) // cut off hash-symbol
        .match(/\w{2}/g) // split into pairs of word-chars (= hex nums)
        .map(e => parseInt(e, 16)) // parse em to base 10
        .join(',');
}

function getMousePos(target, event) {
    const rect = target.getBoundingClientRect();
    return [+(event.clientX - rect.left).toFixed(), +(event.clientY - rect.top).toFixed()];
}

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