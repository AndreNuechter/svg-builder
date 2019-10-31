// NOTE: the below 'exceptions' cannot be set by setAttribute as they're obj props, not attrs
const exceptions = ['checked', 'textContent', 'data'];
/**
 * Applies attributes and properties to an HTMLElement.
 * @param { HTMLElement } element The element to be configured.
 * @param { Object } keyValPairs The attributes and properties to be applied to the element.
 * @returns { HTMLElement }
 */
function configElement(element, keyValPairs) {
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
 * Gives the mouse's x- and y-coordinates within the target in an array.
 * @param { HTMLElement } target The element over which the mouse is moving.
 * @param { Event } event The event triggering this (most likely mouseover)
 * @returns { number[] }
 */
function getMousePos(target, event) {
    const boundingRect = target.getBoundingClientRect();
    return [
        +(event.clientX - boundingRect.left).toFixed(),
        +(event.clientY - boundingRect.top).toFixed()
    ];
}

/**
 * Turns a single point-object into a string that may be inserted into a path's d-attribute.
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

// NOTE: for ellipse (when p has cx) xs are cx +/- rx
// for rects (when p has width) xs are x and x + w
// for ps with cps, its the highest and lowest
const minMaxHandler = {
    path(points, dim) {
        return points.flatMap((point) => {
            const res = [point[dim]];

            if (point.cmd === 'Q' || point.cmd === 'C') res.push(point[`${dim}1`]);
            if (point.cmd === 'C') res.push(point[`${dim}2`]);
            if (point.cmd === 'A') res.push(point[dim] + point[`${dim}R`], point[dim] - point[`${dim}R`]);

            return res;
        });
    },
    ellipse([points], dim) {
        return [points[`c${dim}`], points[`c${dim}`] + points[`r${dim}`], points[`c${dim}`] - points[`r${dim}`]];
    },
    rect([points], dim) {
        return [points[dim], points[dim] + points[dim === 'x' ? 'width' : 'height']];
    }
};

/**
 * Gives an array of the lowest and highest x- and y-components from a set of points.
 * @param { Object } points A set of points belonging to a single layer or the entire drawing.
 * @returns { Object } xMin, yMin, xMax and yMax of the provided set.
 */
// TODO: generalize this to take a single layer or point too and adapt docs above...is it already?
function getMinAndMax(layers) {
    const xs = layers.flatMap(layer => minMaxHandler[layer.mode](layer.points, 'x'));
    const ys = layers.flatMap(layer => minMaxHandler[layer.mode](layer.points, 'y'));
    const xMin = Math.min(...xs);
    const yMin = Math.min(...ys);
    const xMax = Math.max(...xs);
    const yMax = Math.max(...ys);
    return {
        xMin,
        yMin,
        xMax,
        yMax
    };
}

/**
 * Returns an array of the lowest x- and y-components and the pixel-dimensions of the drawing for use within an svg-viewBox-attribute.
 * @param { Object } layers A set of layers belonging to a drawing.
 * @returns { Array }
 */
function getViewBox(layers) {
    const {
        xMin,
        yMin,
        xMax,
        yMax
    } = getMinAndMax(layers);
    return {
        xMin,
        yMin,
        width: xMax - xMin,
        height: yMax - yMin
    };
}

const inc = num => num + 1;
const dec = num => num - 1;

/**
 * Reduces an object of svg-transforms into a string, readily inserted into HTML.
 * @param { Object } transformData The transforms to be stringified.
 * @returns { string } The stringified transforms.
 */
function stringifyTransforms(transformData) {
    return Object
        .keys(transformData)
        .reduce((str, key) => `${str}${key}(${transformData[key]})`, '');
}

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
    dec,
    stringifyTransforms
};