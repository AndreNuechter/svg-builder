import { pathCmds } from './path-commands.js';
import {
    arcCmdConfig,
    controlPointContainer,
    drawingContent,
    fillAndStroke,
    layers,
    outputConfig,
    transformFields,
    svg
} from './dom-shared-elements.js';
import { complexTransforms } from './constants.js';

const exceptions = ['checked', 'textContent', 'data', 'onpointerdown', 'onpointerup'];
const { elements: fillAndStrokeFields } = fillAndStroke;
const { elements: outputConfigFields } = outputConfig;
const configForm = (formElements, conf) => {
    Object.entries(conf).forEach(([key, val]) => {
        formElements[key].value = val;
    });
};

export {
    applyTransforms,
    configElement,
    configClone,
    drawShape,
    getLastArcCmd,
    getNonDefaultStyles,
    getSVGCoords,
    pointToMarkup,
    cloneObj,
    setArcCmdConfig,
    setCmdConfig,
    setFillAndStrokeFields,
    setOutputConfiguration,
    setTransformsFieldset,
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

    if (layers[session.layer]) {
        const layerTransforms = stringifyTransforms(session.activeLayer.transforms);
        applicants.push(layers[session.layer]);
        transformations.push(drawingTransforms + layerTransforms, layerTransforms);
    } else {
        transformations.push(drawingTransforms);
    }

    applicants.forEach((a, i) => a.setAttribute('transform', transformations[i]));
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

/**
 * Turns a single point-object into a string that may be inserted into a path's d-attribute.
 * @param { Object } point The point we are trying to draw.
 * @returns { string }
 */
function pointToMarkup(point) {
    return point.cmd + pathCmds[point.cmd](point);
}

function cloneObj(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    const clone = Array.isArray(obj) ? [] : {};

    Object.keys(obj).forEach((key) => {
        clone[key] = cloneObj(obj[key]);
    });

    return clone;
}

function setArcCmdConfig(session, defaults) {
    const conf = session.activeLayer
        ? (getLastArcCmd(session.activeLayer.points)
            || { ...defaults.arcCmdConfig, ...session.arcCmdConfig })
        : defaults.arcCmdConfig;

    Object.assign(session.arcCmdConfig, conf);
    Object.entries(conf)
        // NOTE: the data might be coming from a point,
        // so we filter out props not shared between a point and the form
        .filter(([key]) => !['cmd', 'x', 'y'].includes(key))
        .forEach(([key, val]) => {
            const field = arcCmdConfig.elements[key];
            field[(field.type === 'checkbox') ? 'checked' : 'value'] = val;
        });
}

function setCmdConfig(session) {
    if (session.activeLayer.mode !== 'path') return;

    session.cmd = session.activeLayer.points.length
        ? session.activeLayer.points[session.activeLayer.points.length - 1].cmd
        : 'M';
}

/**
 * Adjusts the Fill & Stroke fieldset to a given style config.
 * @param { Object } style The config to be applied.
 */
function setFillAndStrokeFields(style) {
    configForm(fillAndStrokeFields, style);
}

/**
 * Adjusts the Output configuration fieldset to a given config.
 * @param { Object } conf The config for the output. Expected to be gotten from `drawing`.
 */
function setOutputConfiguration({ outputConfig: conf }) {
    configForm(outputConfigFields, conf);
}

function setTransformsFieldset(conf) {
    Object.entries(conf)
        // NOTE: we manage translations via arrow-keys and not via the form
        .filter(([key]) => key !== 'translate')
        .forEach(([key, val]) => {
            if (complexTransforms[key]) {
                val.forEach((v, i) => { complexTransforms[key][i].value = v; });
            } else {
                transformFields[key].value = val;
            }
        });
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
            // NOTE: some transforms take more than 1 param, of which some may be ''
            typeof val === 'object'
                ? val.filter(Boolean)
                : val})`, '');
}