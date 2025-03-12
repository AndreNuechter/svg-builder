import pathCmds from './layers/path-commands.js';
import { fillAndStrokeFields, svg } from './dom-selections.js';
import { defaults } from './constants.js';

const exceptions = new Set(['checked', 'textContent', 'data', 'onpointerdown', 'onpointerup']);
const svgPoint = svg.createSVGPoint();

export {
    areObjectsEqual,
    configClone,
    configElement,
    configForm,
    configInput,
    configRangeInputLabel,
    last,
    lastId,
    getRelevantConfiguredStyles,
    getRelevantDefaultStyles,
    getSVGCoords,
    pointToMarkup,
};

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
function configClone(template, attrs) {
    return configElement(template.cloneNode(false), attrs);
}

/**
 * Applies attributes and properties to an HTMLElement.
 * @param { Element } element The element to be configured.
 * @param { Object } keyValPairs The attributes and properties to be applied to the element.
 * @returns { Element }
 */
function configElement(element, keyValPairs) {
    Object.keys(keyValPairs).forEach((key) => {
        if (exceptions.has(key)) {
            element[key] = keyValPairs[key];
        } else {
            element.setAttribute(key, keyValPairs[key]);
        }
    });

    return element;
}

function configInput(input, value) {
    input.value = value;

    if (input.type === 'range') {
        configRangeInputLabel(input);
    }
}

function configForm(formElements, conf) {
    Object.entries(conf).forEach(([key, val]) => {
        configInput(formElements[key], val);
    });
}

/** Display the value of range inputs behind their labels. */
function configRangeInputLabel(target) {
    target.previousElementSibling.dataset.value = ` (${target.value})`;
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