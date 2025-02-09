import { areObjectsEqual } from '../helper-functions.js';
import { defaults } from '../constants.js';
import timeTravel from './drawing-backups.js';

const drawingData = JSON.parse(window.localStorage.getItem('drawing')) || {};
/** @type { name: string, layers: Layer[], outputConfig: constants.outputConfig, transforms: constants.transforms } */
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

export default drawing;
export {
    commitDrawingToStorage,
    isDrawingUntouched,
    redo,
    save,
    undo,
};

function commitDrawingToStorage() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}

function isDrawingUntouched() {
    return drawing.layers.length === 0 &&
        areObjectsEqual(drawing.outputConfig, defaults.outputConfig) &&
        areObjectsEqual(drawingData.transforms, defaults.transforms);
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