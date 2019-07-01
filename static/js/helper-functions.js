function hexToRGB(hex) {
    return hex
        .slice(1) // cut off hash-symbol
        .match(/\w{2}/g) // split into pairs of word-chars
        .map(e => parseInt(e, 16)) // parse em to base 10
        .join(',');
}

function getMousePos(target, event) {
    const rect = target.getBoundingClientRect();
    return [+(event.clientX - rect.left).toFixed(), +(event.clientY - rect.top).toFixed()];
}

// function pointToMarkup(p) {
//     // TODO: include rects
//     return p.cmd === 'A'
//         ? `${[p.cmd, p.xR, p.yR, p.xRot, p.large, p.sweep, p.x, p.y].join(' ')} ` // arc
//         : [
//             p.cmd, // command (M, L, Q or C)
//             p.x1 ? `${[p.x1, p.y1].join(' ')}, ` : '', // cp1
//             p.x2 ? `${[p.x2, p.y2].join(' ')}, ` : '', // cp2
//             `${[p.x, p.y].join(' ')} ` // actual coord
//         ].join(' ');
// }
function pointToMarkup(point) {
    const args = [];

    /* eslint-disable */
    switch (point.cmd) {
        case 'M':
            args.push(point.x, point.y);
            break;
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
        case 'L':
            args.push(point.x,
                point.y);
            break;
        case 'Q':
            args.push(point.x,
                point.y,
                point.x1,
                point.y1);
            break;
        case 'C':
            args.push(point.x,
                point.y,
                point.x1,
                point.y1,
                point.x2,
                point.y2);
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