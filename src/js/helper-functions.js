import { pathCmds } from './path-commands.js';
import { svg } from './dom-shared-elements.js';

/**
 * Gives the transform-corrected x- and y-coordinates within the canvas in an array.
 * @param { Event } event The event triggering this (most likely pointerover).
 * @param { SVGSVGElement } svg The element over which the pointer is moving.
 * @returns { number[] }
 */
function getSVGCoords({ x, y }) {
    let point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
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
        fill: conf.fill ? conf['fill-color'] : 'none',
        'fill-opacity': conf['fill-opacity'],
        stroke: conf['stroke-color'],
        'stroke-opacity': conf['stroke-opacity'],
        'stroke-width': conf['stroke-width']
    };

    if (conf['fill-rule']) res['fill-rule'] = conf['fill-rule'];
    if (conf['stroke-linejoin']) res['stroke-linejoin'] = conf['stroke-linejoin'];
    if (conf['stroke-linecap']) res['stroke-linecap'] = conf['stroke-linecap'];

    return res;
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
    getSVGCoords,
    pointToMarkup,
    saveCloneObj,
    stringifyTransforms
};