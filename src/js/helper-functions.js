import { pathCmds } from './path-commands.js';
import {
    controlPointContainer,
    drawingContent,
    fillAndStrokeFields,
    svg
} from './dom-shared-elements.js';

const exceptions = ['checked', 'textContent', 'data', 'onpointerdown', 'onpointerup'];

export {
    applyTransforms,
    cloneObj,
    areEqual,
    configElement,
    configClone,
    drawShape,
    last,
    lastId,
    getLastArcCmd,
    getNonDefaultStyles,
    getSVGCoords,
    pointToMarkup,
    stringifyTransforms
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

function cloneObj(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    const clone = Array.isArray(obj) ? [] : {};

    Object.keys(obj).forEach((key) => {
        clone[key] = cloneObj(obj[key]);
    });

    return clone;
}

function areEqual(a, b) {
    if (typeof a !== typeof b) return false;

    const temp = [a, b];

    if (temp.every((val) => Number.isNaN(val))) return true;
    if (typeof a !== 'object' || temp.includes(null)) return a === b;

    const keysOfA = Object.keys(a);
    const keysOfB = Object.keys(b);

    if (keysOfA.length !== keysOfB.length) return false;

    return !keysOfA.find((key) => !areEqual(a[key], b[key]));
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

function getNonDefaultStyles(mode) {
    return [...fillAndStrokeFields]
        .filter((field) => field.hasAttribute('name')
            && field.closest('label').classList.contains(`for-${mode}`))
        .reduce((obj, field) => Object.assign(obj, {
            [field.name]: field.value
        }), {});
}

/**
 * Gives the transform-corrected x- and y-coordinates within the canvas in an array.
 * @param { MouseEvent } event The event triggering this (most likely pointerover).
 * @returns { number[] }
 */
function getSVGCoords({ x, y }) {
    let point = svg.createSVGPoint();
    Object.assign(point, { x, y });
    // NOTE: the second child of our canvas is the control-points-container,
    // which has drawing- as well as layer-transforms applied to it
    point = point.matrixTransform(svg.children[1].getScreenCTM().inverse());

    return [point.x, point.y];
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
    return point.cmd + pathCmds[point.cmd](point);
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