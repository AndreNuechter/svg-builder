/* globals window */

import { drawingContent, outputConfig, preview } from './dom-shared-elements.js';
import { stringifyTransforms, configElement } from './helper-functions.js';

const drawing = {};

/**
 * Saves drawing to localStorage.
 */
function save() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}

const layerIdRe = / data-layer-id="\d+?"/g;
const multiSpaces = /\s{2,}/g;
/**
 * Returns the markup of the created drawing (the content of group) inside default svg markup.
 */
function generateMarkUp() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" 
    width="${drawing.dims.width}" 
    height="${drawing.dims.height}" 
    viewBox="${getPaddedViewBox()}" 
    preserveAspectRatio="${[drawing.dims.ratio, drawing.dims['slice-or-meet']].join(' ')}">
        <g transform="${stringifyTransforms(drawing.transforms)}">
            ${drawingContent.innerHTML}
        </g>
    </svg>`
        .replace(layerIdRe, '')
        .replace(multiSpaces, ' ');
}

function getPaddedViewBox() {
    const {
        x,
        y,
        width,
        height
    } = drawingContent.getBBox();

    return [
        x - drawing.dims['padding-left'],
        y - drawing.dims['padding-top'],
        width + (+drawing.dims['padding-left'] + Number(drawing.dims['padding-right'])),
        height + (+drawing.dims['padding-top'] + Number(drawing.dims['padding-bottom']))
    ].join(' ');
}

function updateViewBox() {
    configElement(preview.firstElementChild, {
        width: drawing.dims.width,
        height: drawing.dims.height,
        viewBox: getPaddedViewBox(),
        preserveAspectRatio: [drawing.dims.ratio, drawing.dims['slice-or-meet']].join(' ')
    });
}

const { elements } = outputConfig;
// TODO: stay dry, see fillAndStroke, arcCmdConfig and setTransformsFieldset
function setOutputConfiguration() {
    Object.entries(drawing.dims).forEach(([key, val]) => {
        const field = elements[key];

        if (field.tagName === 'INPUT') {
            field.value = val;
        } else {
            [...field.children].forEach((child) => {
                child.selected = (child.value === val);
            });
        }
    });
}

export {
    drawing,
    generateMarkUp,
    updateViewBox,
    save,
    setOutputConfiguration
};