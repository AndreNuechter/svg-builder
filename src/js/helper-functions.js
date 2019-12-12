import { pathCmds } from './path-commands.js';
import { svg } from './dom-shared-elements.js';

/**
 * Gives the transform-corrected x- and y-coordinates within the canvas in an array.
 * @param { Event } event The event triggering this (most likely pointerover).
 * @param { SVGSVGElement } svg The element over which the pointer is moving.
 * @returns { number[] }
 */
function getSVGCoords(event) {
    let point = svg.createSVGPoint();
    point.x = event.pageX;
    point.y = event.pageY;
    // NOTE: the second child of our canvas is the control-points-container,
    // which has drawing- as well as layer-transforms applied to it
    point = point.matrixTransform(svg.children[1].getScreenCTM().inverse());

    return [point.x, point.y];
}

function saveCloneObj(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Clones the provided element shallowly and returns a partially applied version of configElement().
 * @param { HTMLElement } template The element to be cloned.
 * @returns { Function }
 */
function configClone(template) {
    return attrs => configElement(template.cloneNode(false), attrs);
}

// NOTE: the below 'exceptions' cannot be set by setAttribute as they're props, not attrs
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
    return point.cmd + pathCmds[point.cmd](point).join(' ');
}

/**
 * Prepares a style config to be usable in configElement, since the fill and stroke-attribute-values are computed.
 * @param { Object } conf The config that should be parsed.
 * @returns { Object }
 */
function parseLayerStyle(conf) {
    // NOTE: props added on top are on all shapes, the others are optional
    const res = {
        fill: conf.fill
            ? `rgba(${hexToRGB(conf.fillColor)},${conf.fillOpacity})`
            : 'transparent',
        stroke: `rgba(${hexToRGB(conf.strokeColor)},${conf.strokeOpacity})`,
        'stroke-width': conf.strokeWidth
    };

    if (conf.fillRule) res['fill-rule'] = conf.fillRule;
    if (conf.linejoin) res['stroke-linejoin'] = conf.linejoin;
    if (conf.linecap) res['stroke-linecap'] = conf.linecap;

    return res;
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

/**
 * Returns an eventHandler for drawing a shape (ellipse or rect).
 * @param { SVGEllipseElement | SVGRectElement } shape The shape being drawn.
 * @param { Function } attrs A lambda changing the affected shape based on the current pointer-position.
 * @returns { Function }
 */
function drawShape(shape, attrs) {
    return (e) => {
        const [x1, y1] = getSVGCoords(e);
        configElement(shape, attrs(x1, y1));
    };
}

export {
    configElement,
    configClone,
    drawShape,
    parseLayerStyle,
    hexToRGB,
    getSVGCoords,
    pointToMarkup,
    saveCloneObj,
    stringifyTransforms
};