import { pathCmds } from './path-commands.js';
import {
    controlPointContainer,
    drawingContent,
    fillAndStrokeFields,
    svg,
} from './dom-shared-elements.js';
import { defaults } from './constants.js';

const exceptions = ['checked', 'textContent', 'data', 'onpointerdown', 'onpointerup'];
const svgPoint = svg.createSVGPoint();

export {
    areObjectsEqual,
    applyTransforms,
    configElement,
    configClone,
    drawShape,
    isBoolean,
    last,
    lastId,
    getLastArcCmd,
    getRelevantConfiguredStyles,
    getRelevantDefaultStyles,
    getSVGCoords,
    pointToMarkup,
    stringifyTransforms,
};

/**
 * Applies transforms to the layer-container,
 * the currently active layer and its control points.
 */
function applyTransforms(drawing, session) {
    const drawingTransforms = stringifyTransforms(drawing.transforms);
    const applicants = [drawingContent, controlPointContainer];
    const transformations = [drawingTransforms];

    if (session.activeSVGElement) {
        const layerTransforms = stringifyTransforms(session.activeLayer.transforms);
        applicants.push(session.activeSVGElement);
        transformations.push(drawingTransforms + layerTransforms, layerTransforms);
    } else {
        transformations.push(drawingTransforms);
    }

    applicants.forEach((a, i) => a.setAttribute('transform', transformations[i]));
}

/**
 * Compares two objects by stringifying them.
 * @param { Object } a
 * @param { Object } b
 * @returns Boolean
 */
function areObjectsEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Clones the provided element shallowly and returns a partially applied version of configElement().
 * @param { Node } template The element to be cloned.
 * @returns { Function }
 */
function configClone(template) {
    return (attrs) => configElement(template.cloneNode(false), attrs);
}

/**
 * Applies attributes and properties to an HTMLElement.
 * @param { Element } element The element to be configured.
 * @param { Object } keyValPairs The attributes and properties to be applied to the element.
 * @returns { Element }
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
 * A helper for initializing ellipses and rects.
 * @param { SVGEllipseElement | SVGRectElement } shape The shape being drawn.
 * @param { Function } getAttrs A lambda determining the new geometry of the shape based on the current pointer-position.
 * @returns { Function } An eventHandler for drawing a shape (ellipse or rect).
 */
function drawShape(shape, getAttrs) {
    return (event) => {
        const [x1, y1] = getSVGCoords(event);
        configElement(shape, getAttrs(x1, y1));
    };
}

function getLastArcCmd(points) {
    return points
        .slice()
        .reverse()
        .find((point) => point.cmd === 'A');
}

function getRelevantConfiguredStyles(mode) {
    return getModeSpecificStyleNames(mode)
        .reduce(
            (obj, key) => ({ ...obj, [key]: fillAndStrokeFields[key].value }),
            Object.create(null),
        );
}

function getRelevantDefaultStyles(mode) {
    return getModeSpecificStyleNames(mode)
        .reduce(
            (obj, key) => ({ ...obj, [key]: defaults.style[key] }),
            Object.create(null),
        );
}

function getModeSpecificStyleNames(mode) {
    return Object.keys(defaults.style)
        .filter((key) => !defaults.styleRelevancies[key] || defaults.styleRelevancies[key].includes(mode));
}

/**
 * Gives the transform-corrected x- and y-coordinates within the canvas in an array.
 * @param { MouseEvent } event The event triggering this (most likely pointerover).
 * @returns { number[] }
 */
function getSVGCoords({ x, y }) {
    const { x: svgX, y: svgY } = Object
        .assign(svgPoint, { x, y })
        // NOTE: the second child of our canvas is the control-points-container,
        // which has drawing- as well as layer-transforms applied to it
        .matrixTransform(svg.children[1].getScreenCTM().inverse());

    return [svgX, svgY];
}

function isBoolean(val) {
    return typeof val === 'boolean';
}

function last(arr) {
    return arr[lastId(arr)];
}

function lastId(arr) {
    return arr.length - 1;
}

/**
 * Turns a single point-object into a string that may be inserted into a path's d-attribute.
 * @param { Object } point The point we are trying to draw.
 * @returns { string }
 */
function pointToMarkup(point) {
    return `${point.cmd}${pathCmds[point.cmd](point)}`;
}

/**
 * Reduces an object of svg-transforms into a string, readily inserted into HTML.
 * @param { Object } transformData The transforms to be stringified.
 * @returns { string } The stringified transforms.
 */
function stringifyTransforms(transformData) {
    return Object
        .entries(transformData)
        .reduce((str, [key, val]) => `${str}${key}(${
            // NOTE: scale and rotate take more than 1 param, of which some may be ''
            typeof val === 'object'
                ? val.filter((v) => v !== '')
                : val})`, '');
}