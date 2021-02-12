import { drawingContent, preview } from './dom-shared-elements.js';
import {
    cloneObj,
    compareObjs,
    configElement,
    last,
    setOutputConfiguration,
    stringifyTransforms
} from './helper-functions.js';
import stack from './undo-and-redo/index.js';

/** @type { viewBox: String[], layers: Layer[], outputConfig: constants.outputConfig, transforms: constants.transforms } */
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

export default drawing;
export {
    centerViewBox,
    generateDataURI,
    generateMarkUp,
    save,
    switchToOutputTab,
    updateViewBox
};

// TODO is this a user-action?
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
    save('centerVB');
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
    return `data:image/svg+xml,${generateMarkUp()
        .replace(/"/g, "'")}`
        .replace(/#/g, '%23');
}

/**
 * Saves drawing to localStorage.
 */
function save(msg) {
    // TODO we need a diffing strat as some mutations save multiple times in row (eg add layer, add point, dragging)
    // also, always storing the entire drawing seems wasteful
    console.log(msg);
    if (!compareObjs(last(stack), drawing)) stack.push(cloneObj(drawing));
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}

// TODO user action?
function switchToOutputTab() {
    preview.innerHTML = generateMarkUp();
    if (drawing.viewBox.every((v) => v === 0)) centerViewBox();
}

function updateViewBox() {
    configElement(preview.firstElementChild, {
        width: drawing.outputConfig.width,
        height: drawing.outputConfig.height,
        viewBox: drawing.viewBox,
        preserveAspectRatio: [drawing.outputConfig.ratio, drawing.outputConfig['slice-or-meet']].join(' ')
    });
}