/* globals window */

import {
    drawingContent,
    outputConfig,
    preview
} from './dom-shared-elements.js';
import { stringifyTransforms } from './helper-functions.js';

const drawing = {
    get viewBox() {
        return [
            this.outputDims['vb-min-x'],
            this.outputDims['vb-min-y'],
            this.outputDims['vb-width'],
            this.outputDims['vb-height']
        ];
    }
};
const layerIdRe = / data-layer-id="\d+"/g;
const multiSpaces = /\s{2,}/g;
const { elements } = outputConfig;

export default drawing;
export {
    generateMarkUp,
    save,
    setOutputConfiguration,
    showPreview
};

/**
 * Saves drawing to localStorage.
 */
// TODO: have this be done automatically when drawing mutates...customEvent and a handler on document?
function save() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}

/**
 * Returns the markup of the created drawing (the content of group) inside default svg markup.
 */
function generateMarkUp() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" 
    width="${drawing.outputDims.width}" 
    height="${drawing.outputDims.height}" 
    viewBox="${drawing.viewBox}" 
    preserveAspectRatio="${[drawing.outputDims.ratio, drawing.outputDims['slice-or-meet']].join(' ')}">
        <g transform="${stringifyTransforms(drawing.transforms)}">
            ${drawingContent.innerHTML}
        </g>
    </svg>`
        .replace(layerIdRe, '')
        .replace(multiSpaces, ' ');
}

// TODO: stay dry, see fillAndStroke, arcCmdConfig and setTransformsFieldset
function setOutputConfiguration() {
    Object.entries(drawing.outputDims).forEach(([key, val]) => {
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

function showPreview() { preview.innerHTML = generateMarkUp(); }