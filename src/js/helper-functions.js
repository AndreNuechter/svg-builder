/**
 * Applies attributes and properties to an HTMLElement.
 * @param { HTMLElement } element The element to be configured.
 * @param { Object } keyValPairs The attributes and properties to be applied to the element.
 * @returns { HTMLElement }
 */
function configElement(element, keyValPairs) {
    // NOTE: the below 'exceptions' cannot be set by setAttribute as they're obj props, not attrs
    const exceptions = ['checked', 'textContent', 'data'];

    Object.keys(keyValPairs).forEach((key) => {
        if (exceptions.includes(key)) {
            element[key] = keyValPairs[key];
        } else {
            element.setAttribute(key, keyValPairs[key]);
        }
    });

    return element;
}

/**
 * Clones the provided element shallowly and returns a partially applied version of configElement().
 * @param { HTMLElement } template The element to be cloned.
 * @returns { Function }
 */
function configClone(template) {
    return attrs => configElement(template.cloneNode(false), attrs);
}

/**
 * Prepares a style config to be usable in configElement, since the fill and stroke-attribute-values are computed.
 * @param { Object } conf The config that should be parsed.
 * @returns { Object }
 */
function parseLayerStyle(conf) {
    return {
        'fill-rule': conf.fillRule,
        fill: conf.fill
            ? `rgba(${hexToRGB(conf.fillColor)}, ${conf.fillOpacity})`
            : 'transparent',
        stroke: `rgba(${[hexToRGB(conf.strokeColor), conf.strokeOpacity].join(',')})`,
        'stroke-width': conf.strokeWidth
    };
}

const re = /[a-z\d]{2}/gi;
/**
 * Converts a string of hexadecimals into a stringified triplet of integers to be used as RGB color values.
 * @param { string } hex The hexadecimal representation to be converted.
 * @returns { string }
 */
function hexToRGB(hex) {
    return hex
        .slice(1) // cut off hash-symbol
        .match(re) // split into pairs of word-chars or hex nums
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
    return [
        +(event.clientX - target.left).toFixed(),
        +(event.clientY - target.top).toFixed()
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
 * Gives an array of the lowest and highest x- and y-components from a set of points.
 * @param { Object } points A set of points belonging to a single layer.
 * @returns { Array }
 */
function getMinAndMax(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const xMin = Math.min(...xs);
    const yMin = Math.min(...ys);
    const xMax = Math.max(...xs);
    const yMax = Math.max(...ys);
    return [xMin, yMin, xMax, yMax];
}

// for ellipse (when p has cx) xs are cx +/- rx
// for rects (when p has width) xs are x and x + w
// for ps with cps, its the highest and lowest
// TODO: DRY
const minMaxXHandler = {
    path(points) {
        return points.flatMap((point) => {
            const res = [point.x];

            if (point.cmd === 'Q' || point.cmd === 'C') res.push(point.x1);
            if (point.cmd === 'C') res.push(point.x2);
            if (point.cmd === 'A') res.push(point.x + point.xR, point.x - point.xR);

            return res;
        });
    },
    ellipse(points) {
        return [points[0].cx, points[0].cx + points[0].rx, points[0].cx - points[0].rx];
    },
    rect(points) {
        return points[0] ? [points[0].x, points[0].x + points[0].width] : [];
    }
};
const minMaxYHandler = {
    path(points) {
        return points.flatMap((point) => {
            const res = [point.y];

            if (point.cmd === 'Q' || point.cmd === 'C') res.push(point.y1);
            if (point.cmd === 'C') res.push(point.y2);
            if (point.cmd === 'A') res.push(point.y + point.yR, point.y - point.yR);

            return res;
        });
    },
    ellipse(points) { // TODO might need check too, c below
        return [points[0].cy, points[0].cy + points[0].ry, points[0].cy - points[0].ry];
    },
    rect(points) {
        return points[0] ? [points[0].y, points[0].y + points[0].height] : [];
    }
};

/**
 * Returns an array of the lowest x- and y-components and the pixel-dimensions of the drawing for use within an svg-viewBox-attribute.
 * @param { Object } layers A set of layers belonging to a drawing.
 * @returns { Array }
 */
function getViewBox(layers) {
    const xs = layers.flatMap(layer => minMaxXHandler[layer.mode](layer.points));
    const ys = layers.flatMap(layer => minMaxYHandler[layer.mode](layer.points));
    const xMin = Math.min(...xs);
    const yMin = Math.min(...ys);
    const xMax = Math.max(...xs);
    const yMax = Math.max(...ys);
    return [xMin, yMin, xMax - xMin, yMax - yMin];
}

const inc = num => num + 1;
const dec = num => num - 1;

export {
    configElement,
    configClone,
    parseLayerStyle,
    hexToRGB,
    getMousePos,
    pointToMarkup,
    getMinAndMax,
    getViewBox,
    inc,
    dec
};