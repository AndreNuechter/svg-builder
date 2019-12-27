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

export {
    applyTransforms,
    configElement,
    configClone,
    drawShape,
    getLastArcCmd,
    getNonDefaultStyles,
    getSVGCoords,
    pointToMarkup,
    saveCloneObj,
    setArcCmdConfig,
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
        const layerTransforms = stringifyTransforms(session.current.transforms);
        applicants.push(layers[session.layer]);
        transformations.push(drawingTransforms + layerTransforms, layerTransforms);
    } else {
        transformations.push(drawingTransforms);
    }

    applicants.forEach((a, i) => a.setAttribute('transform', transformations[i]));
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
 * A helper for initializing ellipses and rects.
 * @param { SVGEllipseElement | SVGRectElement } shape The shape being drawn.
 * @param { Function } getAttrs A lambda determining the new geometry of the shape based on the current pointer-position.
 * @returns { Function } An eventHandler for drawing a shape (ellipse or rect).
 */
function drawShape(shape, getAttrs) {
    return (e) => {
        const [x1, y1] = getSVGCoords(e);
        configElement(shape, getAttrs(x1, y1));
    };
}

function getLastArcCmd(points) {
    return points
        .slice()
        .reverse()
        .find(point => point.cmd === 'A');
}

function getNonDefaultStyles(mode) {
    return [...fillAndStrokeFields]
        .filter(field => field.hasAttribute('name')
            && field.closest('label').classList.contains(`for-${mode}`))
        .reduce((obj, field) => Object.assign(obj, {
            [field.name]: field.value
        }), {});
}

/**
 * Gives the transform-corrected x- and y-coordinates within the canvas in an array.
 * @param { Event } event The event triggering this (most likely pointerover).
 * @param { SVGSVGElement } svg The element over which the pointer is moving.
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
    return point.cmd + pathCmds[point.cmd](point).join(' ');
}

function saveCloneObj(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function setArcCmdConfig(session, defaults) {
    const conf = session.current
        ? (getLastArcCmd(session.current.points)
            || Object.assign({}, defaults.arcCmdConfig, session.arcCmdConfig))
        : defaults.arcCmdConfig;

    Object.assign(session.arcCmdConfig, conf);
    Object.entries(conf)
        .filter(([key]) => !['cmd', 'x', 'y'].includes(key)) // NOTE: the data might be coming from a point
        .forEach(([key, val]) => {
            const field = arcCmdConfig.elements[key];
            field[(field.type === 'checkbox') ? 'checked' : 'value'] = val;
        });
}

/**
 * Adjusts the Fill & Stroke fieldset to a given style config.
 * @param { Object } conf The config to be applied.
 */
function setFillAndStrokeFields(conf) {
    Object.entries(conf).forEach(([key, val]) => {
        const field = fillAndStrokeFields[key];

        if (field.tagName === 'INPUT') {
            field.value = val;
        } else {
            [...field.children].forEach((child) => {
                child.selected = (child.value === val);
            });
        }
    });
}

// TODO: stay dry, see fillAndStroke, arcCmdConfig and setTransformsFieldset
function setOutputConfiguration(drawing) {
    Object.entries(drawing.outputDims).forEach(([key, val]) => {
        const field = outputConfigFields[key];

        if (field.tagName === 'INPUT') {
            field.value = val;
        } else {
            [...field.children].forEach((child) => {
                child.selected = (child.value === val);
            });
        }
    });
}

function setTransformsFieldset(conf) {
    Object.entries(conf)
        .filter(([key]) => key !== 'translate') // NOTE: we manage translations via arrow-keys
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
        .reduce((str, [key, val]) => `${str}${key}(${typeof val === 'object'
            ? val.filter(v => v !== '')
            : val})`, '');
}