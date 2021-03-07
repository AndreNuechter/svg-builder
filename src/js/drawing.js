import {
    drawingContent, layers, preview, redoBtn, undoBtn
} from './dom-shared-elements.js';
import {
    cloneObj,
    configElement,
    lastId,
    stringifyTransforms
} from './helper-functions.js';
import { setOutputConfig } from './form-handling.js';
import { defaults } from './constants.js';

const layerIdRe = / data-layer-id="\d+"/g;
const multiSpaces = /\s{2,}/g;
const drawingData = JSON.parse(window.localStorage.getItem('drawing')) || {};
/** @type { layers: Layer[], outputConfig: constants.outputConfig, transforms: constants.transforms } */
const drawing = {
    outputConfig: drawingData.outputConfig || { ...defaults.outputConfig },
    transforms: drawingData.transforms || cloneObj(defaults.transforms),
    layers: drawingData.layers || []
};
const drawingBackups = [cloneObj(drawing)];
const commitDrawingToStorage = () => window.localStorage.setItem('drawing', JSON.stringify(drawing));
let currentIndex = 0;

export default drawing;
export {
    centerViewBox,
    generateDataURI,
    generateMarkUp,
    redo,
    save,
    switchToOutputTab,
    toggleTimeTravelButtons,
    undo,
    updateViewBox
};

function getDrawingVBox() {
    return [
        drawing.outputConfig['vb-min-x'],
        drawing.outputConfig['vb-min-y'],
        drawing.outputConfig['vb-width'],
        drawing.outputConfig['vb-height']
    ];
}

function centerViewBox() {
    const {
        x,
        y,
        width,
        height
    } = drawingContent.getBBox();

    Object.assign(drawing.outputConfig, {
        'vb-min-x': Math.trunc(x).toString(),
        'vb-min-y': Math.trunc(y).toString(),
        'vb-width': Math.trunc(width).toString(),
        'vb-height': Math.trunc(height).toString()
    });

    updateViewBox();
    setOutputConfig(drawing);
    save('centerVB');
}

/**
 * Returns the markup of the created drawing (wo the cps) inside default svg markup.
 */
function generateMarkUp() {
    return `<svg xmlns="http://www.w3.org/2000/svg" 
    width="${drawing.outputConfig.width}" 
    height="${drawing.outputConfig.height}" 
    viewBox="${getDrawingVBox()}" 
    preserveAspectRatio="${`${drawing.outputConfig.ratio} ${drawing.outputConfig['slice-or-meet']}`}">
    <g transform="${stringifyTransforms(drawing.transforms)}">${drawingContent.innerHTML}</g></svg>`
        .replace(layerIdRe, '')
        .replace(multiSpaces, ' ');
}

function generateDataURI() {
    return `data:image/svg+xml,${generateMarkUp()
        .replace(/"/g, "'")}`
        .replace(/#/g, '%23');
}

/**
 * Creates a backup of drawing and saves to localStorage.
 */
function save(msg) {
    createStateBackup({ layers: cloneObj(drawing.layers), transforms: cloneObj(drawing.transforms) });
    console.log(msg);
    commitDrawingToStorage();
}

function currentItem() {
    return drawingBackups[currentIndex];
}

function undo() {
    if (drawingBackups.length > 1 && currentIndex > 0) {
        currentIndex -= 1;
        resetCanvas();
        toggleTimeTravelButtons();
    }
}

function redo() {
    if (currentIndex < lastId(drawingBackups)) {
        currentIndex += 1;
        resetCanvas();
        toggleTimeTravelButtons();
    }
}

function toggleTimeTravelButtons() {
    undoBtn.disabled = currentIndex === 0;
    redoBtn.disabled = currentIndex === lastId(drawingBackups);
}

/**
 *  Backs up the drawing and sets currentItem to point at that. Also, if there were items afterwards, they're truncated.
 * @param { Object } newDrawing A clone of the relevant bits of drawing after some mutation.
 */
function createStateBackup(newDrawing) {
    if (currentIndex < lastId(drawingBackups)) drawingBackups.length = currentIndex + 1;
    drawingBackups.push(newDrawing);
    currentIndex = lastId(drawingBackups);
    toggleTimeTravelButtons();
}

function resetCanvas() {
    const { layers: layersData, transforms } = currentItem();
    Object.assign(drawing, { layers: cloneObj(layersData), transforms: cloneObj(transforms) });
    commitDrawingToStorage();
    [...layers].forEach((l) => l.remove());
    document.dispatchEvent(new Event('resetCanvas'));
}

function switchToOutputTab() {
    preview.innerHTML = generateMarkUp();
    if (getDrawingVBox().every((v) => v === 0)) centerViewBox();
}

function updateViewBox() {
    configElement(preview.firstElementChild, {
        width: drawing.outputConfig.width,
        height: drawing.outputConfig.height,
        viewBox: getDrawingVBox(),
        preserveAspectRatio: `${drawing.outputConfig.ratio} ${drawing.outputConfig['slice-or-meet']}`
    });
}