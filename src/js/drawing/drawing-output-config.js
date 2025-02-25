import { optimize } from 'svgo';
import { drawingContent, preview } from '../dom-selections';
import { setOutputConfig } from '../form-handling';
import drawing, { save } from './drawing';
import { configElement, stringifyTransforms } from '../helper-functions';

const layerIdRe = / data-layer-id="\d+"/g;
const multiSpaces = /\s{2,}/g;
let enteredOutputTabBefore = false;

export {
    centerViewBox,
    generateDataURI,
    generateMarkUp,
    switchToOutputTab,
    updateViewBox,
};

function centerViewBox() {
    const {
        x,
        y,
        width,
        height,
    } = drawingContent.getBBox();

    Object.assign(drawing.outputConfig, {
        'vb-min-x': Math.trunc(x).toString(),
        'vb-min-y': Math.trunc(y).toString(),
        'vb-width': Math.trunc(width).toString(),
        'vb-height': Math.trunc(height).toString(),
    });

    updateViewBox();
    setOutputConfig(drawing);
    save('centerVB');
}

/**
 * Returns the markup of the created drawing (wo the cps) inside default svg markup.
 */
function generateMarkUp() {
    return optimize(`<svg xmlns="http://www.w3.org/2000/svg" 
    width="${drawing.outputConfig.width}" 
    height="${drawing.outputConfig.height}" 
    viewBox="${getDrawingVBox()}" 
    preserveAspectRatio="${`${drawing.outputConfig.ratio} ${drawing.outputConfig['slice-or-meet']}`}">
    <g transform="${stringifyTransforms(drawing.transforms)}">${drawingContent.innerHTML}</g></svg>`
        .replace(layerIdRe, '')
        .replace(multiSpaces, ' ')).data;
}

function generateDataURI() {
    return `data:image/svg+xml,${generateMarkUp()
        .replace(/"/g, "'")}`
        .replace(/#/g, '%23');
}

function getDrawingVBox() {
    return [
        drawing.outputConfig['vb-min-x'],
        drawing.outputConfig['vb-min-y'],
        drawing.outputConfig['vb-width'],
        drawing.outputConfig['vb-height'],
    ];
}

function switchToOutputTab() {
    preview.innerHTML = generateMarkUp();
    if (getDrawingVBox().every((v) => v === 0)) centerViewBox();
    // set viewBox to boundingBox, when entering output tab for the first time
    if (!enteredOutputTabBefore) {
        enteredOutputTabBefore = true;
        centerViewBox();
    }
}

function updateViewBox() {
    configElement(preview.firstElementChild, {
        width: drawing.outputConfig.width,
        height: drawing.outputConfig.height,
        viewBox: getDrawingVBox(),
        preserveAspectRatio: `${drawing.outputConfig.ratio} ${drawing.outputConfig['slice-or-meet']}`,
    });
}