/* globals window, document */

import { downloadAsPngLink, drawingContent, preview } from './dom-shared-elements.js';
import { configElement, setOutputConfiguration, stringifyTransforms } from './helper-functions.js';

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
const img = document.createElement('img');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

export default drawing;
export {
    centerViewBox,
    generateDataURI,
    generateMarkUp,
    save,
    setPngDownloadLink,
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
    width="${drawing.outputDims.width}" 
    height="${drawing.outputDims.height}" 
    viewBox="${drawing.viewBox}" 
    preserveAspectRatio="${[drawing.outputDims.ratio, drawing.outputDims['slice-or-meet']].join(' ')}">
    <g transform="${stringifyTransforms(drawing.transforms)}">${drawingContent.innerHTML}</g></svg>`
        .replace(layerIdRe, '')
        .replace(multiSpaces, ' ');
}

function generateDataURI() {
    return encodeURI(`data:image/svg+xml,${generateMarkUp().replace(/"/g, "'")}`).replace(/#/g, '%23');
}

function showPreview() { preview.innerHTML = generateMarkUp(); }

function setPngDownloadLink() {
    img.src = generateDataURI();
    img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
        downloadAsPngLink.href = canvas.toDataURL();
    };
}

function switchToOutputTab() {
    if (drawing.viewBox.filter(v => v === 0).length === 4) centerViewBox();
    setPngDownloadLink();
    showPreview();
}

function centerViewBox() {
    const {
        x,
        y,
        width,
        height
    } = drawingContent.getBBox();

    drawing.outputDims['vb-min-x'] = Math.trunc(x);
    drawing.outputDims['vb-min-y'] = Math.trunc(y);
    drawing.outputDims['vb-width'] = Math.trunc(width);
    drawing.outputDims['vb-height'] = Math.trunc(height);

    updateViewBox();
    setOutputConfiguration(drawing);
    save();
}

function updateViewBox() {
    configElement(preview.firstElementChild, {
        width: drawing.outputDims.width,
        height: drawing.outputDims.height,
        viewBox: drawing.viewBox,
        preserveAspectRatio: [drawing.outputDims.ratio, drawing.outputDims['slice-or-meet']].join(' ')
    });
}