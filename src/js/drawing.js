/* globals window */

import { drawingContent, preview } from './dom-shared-elements.js';
import { configElement, setOutputConfiguration, stringifyTransforms } from './helper-functions.js';

const drawing = {
    get viewBox() {
        return [
            this.outputConfig['vb-min-x'],
            this.outputConfig['vb-min-y'],
            this.outputConfig['vb-width'],
            this.outputConfig['vb-height']
        ];
    }
};
const layerIdRe = / data-layer-id="\d+"/g;
const multiSpaces = /\s{2,}/g;
const showPreview = () => { preview.innerHTML = generateMarkUp(); };

export default drawing;
export {
    centerViewBox,
    generateDataURI,
    generateMarkUp,
    save,
    switchToOutputTab,
    updateViewBox
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
    return `<svg xmlns="http://www.w3.org/2000/svg" 
    width="${drawing.outputConfig.width}" 
    height="${drawing.outputConfig.height}" 
    viewBox="${drawing.viewBox}" 
    preserveAspectRatio="${[drawing.outputConfig.ratio, drawing.outputConfig['slice-or-meet']].join(' ')}">
    <g transform="${stringifyTransforms(drawing.transforms)}">${drawingContent.innerHTML}</g></svg>`
        .replace(layerIdRe, '')
        .replace(multiSpaces, ' ');
}

function generateDataURI() {
    return encodeURI(`data:image/svg+xml,${generateMarkUp()
        .replace(/"/g, "'")}`)
        .replace(/#/g, '%23');
}

function switchToOutputTab() {
    showPreview();
    if (drawing.viewBox.filter(v => v === 0).length === 4) centerViewBox();
}

function centerViewBox() {
    const {
        x,
        y,
        width,
        height
    } = drawingContent.getBBox();

    Object.assign(drawing.outputConfig, {
        'vb-min-x': Math.trunc(x),
        'vb-min-y': Math.trunc(y),
        'vb-width': Math.trunc(width),
        'vb-height': Math.trunc(height)
    });

    updateViewBox();
    setOutputConfiguration(drawing);
    save();
}

function updateViewBox() {
    configElement(preview.firstElementChild, {
        width: drawing.outputConfig.width,
        height: drawing.outputConfig.height,
        viewBox: drawing.viewBox,
        preserveAspectRatio: [drawing.outputConfig.ratio, drawing.outputConfig['slice-or-meet']].join(' ')
    });
}