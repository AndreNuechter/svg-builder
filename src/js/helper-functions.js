/**
 * Gives the transform-corrected x- and y-coordinates within the canvas in an array.
 * @param { Event } event The event triggering this (most likely mouseover).
 * @param { SVGSVGElement } svg The element over which the mouse is moving.
 * @returns { number[] }
 */
function getSVGCoords(event, svg) {
    let pt = svg.createSVGPoint();
    pt.x = event.pageX;
    pt.y = event.pageY;
    // NOTE: the second child of our canvas is the control-points-container,
    // which has drawing- as well as layer-transforms applied to it
    pt = pt.matrixTransform(svg.children[1].getScreenCTM().inverse());

    return [pt.x, pt.y];
}

/**
 * Clones the provided element shallowly and returns a partially applied version of configElement().
 * @param { HTMLElement } template The element to be cloned.
 * @returns { Function }
 */
function configClone(template) {
    return attrs => configElement(template.cloneNode(false), attrs);
}

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
 * Reduces an object of svg-transforms into a string, readily inserted into HTML.
 * @param { Object } transformData The transforms to be stringified.
 * @returns { string } The stringified transforms.
 */
function stringifyTransforms(transformData) {
    return Object
        .entries(transformData)
        .reduce((str, [key, val]) => `${str}${key}(${val})`, '');
}

const amounts = {
    M: 1,
    L: 1,
    H: 1,
    V: 1,
    Q: 2,
    C: 3,
    A: 1
};
const getIdOfControlPoint = (layer, id) => layer.points
    .slice(0, id)
    .reduce((cps, point) => cps + amounts[point.cmd], 0);

const inc = num => num + 1;
const dec = num => num - 1;

export {
    configElement,
    configClone,
    parseLayerStyle,
    hexToRGB,
    getSVGCoords,
    pointToMarkup,
    inc,
    dec,
    stringifyTransforms,
    getIdOfControlPoint
};