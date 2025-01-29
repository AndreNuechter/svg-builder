import { optimize } from 'svgo';
import { drawingContent, preview } from '../dom-shared-elements.js';
import { configElement, stringifyTransforms } from '../helper-functions.js';
import { setOutputConfig } from '../form-handling.js';
import { defaults } from '../constants.js';
import timeTravel from './drawing-backups.js';

const layerIdRe = / data-layer-id="\d+"/g;
const multiSpaces = /\s{2,}/g;
const drawingData = JSON.parse(window.localStorage.getItem('drawing')) || {};
/** @type { layers: Layer[], outputConfig: constants.outputConfig, transforms: constants.transforms } */
const drawing = Object.assign(
    Object.create(null),
    {
        name: drawingData.name || '',
        layers: drawingData.layers || [],
        outputConfig: drawingData.outputConfig || structuredClone(defaults.outputConfig),
        transforms: drawingData.transforms || structuredClone(defaults.transforms),
    }
);
const { createBackup, redo, undo } = timeTravel(drawing, commitDrawingToStorage);
let enteredOutputTabBefore = false;

export default drawing;
export {
    centerViewBox,
    commitDrawingToStorage,
    generateDataURI,
    generateMarkUp,
    isDrawingUntouched,
    redo,
    save,
    switchToOutputTab,
    undo,
    updateViewBox,
};

function commitDrawingToStorage() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}

function isDrawingUntouched() {
    return drawing.layers.length === 0 &&
        areObjectsEqual(drawing.outputConfig, defaults.outputConfig) &&
        areObjectsEqual(drawingData.transforms, defaults.transforms);
}

function areObjectsEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function getDrawingVBox() {
    return [
        drawing.outputConfig['vb-min-x'],
        drawing.outputConfig['vb-min-y'],
        drawing.outputConfig['vb-width'],
        drawing.outputConfig['vb-height'],
    ];
}

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

/**
 * Creates a backup of drawing and saves it to localStorage.
 */
function save(msg) {
    createBackup({
        layers: structuredClone(drawing.layers),
        transforms: structuredClone(drawing.transforms)
    });
    // eslint-disable-next-line no-console
    console.log(msg);
    document.dispatchEvent(new Event('saveDrawing'));
    commitDrawingToStorage();
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