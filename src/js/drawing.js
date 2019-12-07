/* globals window */

import { drawingContent, preview } from './dom-shared-elements.js';
import { stringifyTransforms, configElement } from './helper-functions.js';

const drawing = {};

/**
 * Saves drawing to localStorage.
 */
function save() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}

/**
 * Returns the markup of the created drawing (the content of group) inside default svg markup.
 */
function generateMarkUp() {
    const {
        x,
        y,
        width,
        height
    } = drawingContent.getBBox();

    return `
    <svg 
    xmlns="http://www.w3.org/2000/svg"
    width="${drawing.dims.width}" 
    height="${drawing.dims.height}" 
    viewBox="${[x, y, width, height].join(' ')}" 
    preserveAspectRatio="${[drawing.dims.ratio, drawing.dims['slice-or-meet']].join(' ')}">
    <g transform="${stringifyTransforms(drawing.transforms)}">
        ${drawingContent.innerHTML}
    </g>
    </svg>`
        .replace(/ data-layer-id="\d+?"/g, '')
        .replace(/\s{2,}/g, ' ');
}

function updateViewBox() {
    const {
        x,
        y,
        width,
        height
    } = drawingContent.getBBox();

    configElement(preview.firstElementChild, {
        width: drawing.dims.width,
        height: drawing.dims.height,
        viewBox: [
            x - drawing.dims['padding-left'],
            y - drawing.dims['padding-top'],
            width + (+drawing.dims['padding-left'] + +drawing.dims['padding-right']),
            height + (+drawing.dims['padding-top'] + +drawing.dims['padding-bottom'])
        ].join(' '),
        preserveAspectRatio: [drawing.dims.ratio, drawing.dims['slice-or-meet']].join(' ')
    });
}

export {
    drawing,
    generateMarkUp,
    updateViewBox,
    save
};