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
const { createBackup, redo, undo } = timeTravel(drawing);

export default drawing;
export {
    clearDrawing,
    isDrawingUntouched,
    redo,
    save,
    undo,
};

function clearDrawing() {
    if (drawing.layers.length === 0) return;

    Object.assign(drawing, {
        name: '',
        layers: [],
        outputConfig: structuredClone(defaults.outputConfig),
        transforms: structuredClone(defaults.transforms),
    });
    save('clear');
    document.dispatchEvent(new Event('initializeCanvas'));
}

function isDrawingUntouched() {
    return drawing.layers.length === 0 &&
        areObjectsEqual(drawing.outputConfig, defaults.outputConfig) &&
        areObjectsEqual(drawingData.transforms, defaults.transforms);
}

/**
 * Creates a backup of drawing and saves it to localStorage when called wo a msg.
 */
function save(msg) {
    // NOTE: is only called wo a msg when the window is hidden
    if (msg === undefined) {
        window.localStorage.setItem('drawing', JSON.stringify(drawing));
        return;
    }

    // eslint-disable-next-line no-console
    console.log(msg);

    createBackup({
        layers: structuredClone(drawing.layers),
        transforms: structuredClone(drawing.transforms)
    });
    document.dispatchEvent(new Event('saveDrawing'));
}