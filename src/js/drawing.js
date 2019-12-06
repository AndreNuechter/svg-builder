/* globals window, document */

import { drawingContent } from './dom-shared-elements.js';
import { stringifyTransforms } from './helper-functions.js';

const drawing = {};
const ratio = document.getElementById('ratio');
const sliceOrMeet = document.getElementById('slice-or-meet');

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
    const drawingTransforms = stringifyTransforms(drawing.transforms);

    return `
    <svg 
    xmlns="http://www.w3.org/2000/svg"
    width="${drawing.dims.width}" 
    height="${drawing.dims.height}" 
    viewBox="${[x, y, width, height].join(' ')}" 
    preserveAspectRatio="${[ratio.value, sliceOrMeet.value].join(' ')}">
    <g transform="${drawingTransforms}">
        ${drawingContent.innerHTML}
    </g>
    </svg>`
        .replace(/ data-layer-id="\d+?"/g, '')
        .replace(/\s{2,}/g, ' ');
}

export {
    drawing,
    generateMarkUp,
    save
};