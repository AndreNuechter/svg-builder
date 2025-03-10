import './components/collapsable-fieldsets.js';
import './components/coords-display.js';
import './components/tabs.js';
import './drawing/project-management.js';
import {
    cmdSelect,
    downloadBtn,
    layerSelect,
    modesForm,
    outputConfig,
    pathClosingToggle,
    svg,
    transformsForm,
    transformTargetSwitch,
    fillAndStrokeForm,
    undoBtn,
    redoBtn,
} from './dom-selections.js';
import changeBackgroundGridSize from './change-background-grid-size.js';
import {
    centerViewBox,
    configOutput,
    copyDataURIToClipboard,
    copyMarkupToClipboard,
    switchToOutputTab,
    triggerDownload
} from './output-handling.js';
import { clearDrawing, redo, save, undo } from './drawing/drawing.js';
import { initializeSession } from './session.js';
import {
    addLayer,
    changeLayerLabel,
    dragLayerSelector,
    dragLayerSelectorOver,
    duplicateLayer,
    reorderLayers,
    selectOrDeleteLayer,
    startDraggingLayerSelector
} from './layers/layer-management.js';
import initializeCanvas from './drawing/initialize-canvas.js';
import { arrowKeyup, pressKey } from './keyboard-interaction.js';
import {
    centerRotation,
    resetTransforms,
    setTransform,
    setTransformTarget
} from './transform-handling.js';
import { configRangeInputLabel } from './helper-functions.js';
import { setCmd, togglePathClosing } from './layers/active-layer-config.js';
import { setFillOrStroke } from './fill-and-stroke-handling.js';
import addPoint from './layers/add-point.js';
import setMode from './set-mode.js';

// FIXME clearing the canvas or deleting a layer doesnt clear activelayer config...what would be appropriate defaults when a layer is empty?

cmdSelect.addEventListener('change', setCmd);
document.addEventListener('initializeCanvas', initializeCanvas);
document.getElementById('reset-transforms').addEventListener('click', resetTransforms);
document.getElementById('get-markup').addEventListener('click', copyMarkupToClipboard);
document.getElementById('get-data-uri').addEventListener('click', copyDataURIToClipboard);
document.getElementById('center-rotation-btn').addEventListener('click', centerRotation);
document.getElementById('center-vb').addEventListener('click', centerViewBox);
document.getElementById('add-layer').addEventListener('click', addLayer);
document.getElementById('clear-all').addEventListener('click', clearDrawing);
document.getElementById('duplicate-layer').addEventListener('click', duplicateLayer);
document.querySelector('a[data-linked-tab="output"]').addEventListener('click', switchToOutputTab);
document.querySelectorAll('input[type="range"]')
    .forEach((slider) => slider.addEventListener('input', ({ target }) => configRangeInputLabel(target)));
downloadBtn.addEventListener('click', triggerDownload);
fillAndStrokeForm.addEventListener('input', setFillOrStroke);
fillAndStrokeForm.addEventListener('change', () => save('setFillOrStroke'));
layerSelect.addEventListener('input', changeLayerLabel);
layerSelect.addEventListener('pointerdown', startDraggingLayerSelector);
layerSelect.addEventListener('dragstart', dragLayerSelector);
layerSelect.addEventListener('dragover', dragLayerSelectorOver);
layerSelect.addEventListener('click', selectOrDeleteLayer);
layerSelect.addEventListener('drop', reorderLayers);
modesForm.addEventListener('change', setMode);
outputConfig.addEventListener('input', configOutput);
pathClosingToggle.addEventListener('change', togglePathClosing);
redoBtn.addEventListener('click', redo);
svg.addEventListener('wheel', changeBackgroundGridSize);
svg.addEventListener('pointerdown', addPoint);
transformsForm.addEventListener('input', setTransform);
transformsForm.addEventListener('change', () => save('setTransform'));
transformTargetSwitch.addEventListener('change', setTransformTarget);
undoBtn.addEventListener('click', undo);
window.addEventListener('keydown', pressKey);
window.addEventListener('keyup', arrowKeyup);
window.addEventListener('DOMContentLoaded', initializeSession, { once: true });
window.addEventListener('DOMContentLoaded', initializeCanvas, { once: true });
window.addEventListener('submit', (event) => event.preventDefault());