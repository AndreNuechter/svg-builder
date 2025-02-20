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
} from './dom-shared-elements.js';
import {
    addPoint,
    centerRotation,
    changeBackgroundGridSize,
    configOutput,
    copyDataURIToClipboard,
    finalizeShape,
    copyMarkupToClipboard,
    pressKey,
    redo,
    resetTransforms,
    setCmd,
    setFillOrStroke,
    setLayer,
    setMode,
    setTransform,
    setTransformTarget,
    togglePathClosing,
    triggerDownload,
    arrowKeyup,
} from './user-actions.js';
import { centerViewBox, switchToOutputTab } from './drawing/drawing-output-config.js';
import { clearDrawing, save, undo } from './drawing/drawing.js';
import { initializeSession } from './session.js';
import {
    addLayer,
    changeLayerLabel,
    deleteLayer,
    dragLayerSelector,
    duplicateLayer,
    reorderLayers
} from './layers/layer-management.js';
import initializeCanvas from './drawing/initialize-canvas.js';

cmdSelect.addEventListener('change', setCmd);
document.addEventListener('initializeCanvas', initializeCanvas);
document.getElementById('reset-transforms').addEventListener('click', resetTransforms);
document.getElementById('get-markup').addEventListener('click', copyMarkupToClipboard);
document.getElementById('get-data-uri').addEventListener('click', copyDataURIToClipboard);
document.getElementById('center-rotation-btn').addEventListener('click', centerRotation);
document.getElementById('center-vb').addEventListener('click', centerViewBox);
document.getElementById('add-layer').addEventListener('click', addLayer);
document.getElementById('del-layer').addEventListener('click', deleteLayer);
document.getElementById('clear-all').addEventListener('click', clearDrawing);
document.getElementById('duplicate-layer').addEventListener('click', duplicateLayer);
document.querySelector('a[data-linked-tab="output"]').addEventListener('click', switchToOutputTab);
downloadBtn.addEventListener('click', triggerDownload);
fillAndStrokeForm.addEventListener('input', setFillOrStroke);
fillAndStrokeForm.addEventListener('change', () => save('setFillOrStroke'));
layerSelect.addEventListener('input', changeLayerLabel);
layerSelect.addEventListener('change', setLayer);
layerSelect.addEventListener('dragstart', dragLayerSelector);
layerSelect.addEventListener('drop', reorderLayers);
modesForm.addEventListener('change', setMode);
outputConfig.addEventListener('input', configOutput);
pathClosingToggle.addEventListener('change', togglePathClosing);
redoBtn.addEventListener('click', redo);
svg.addEventListener('wheel', changeBackgroundGridSize);
svg.addEventListener('pointerdown', addPoint);
svg.addEventListener('pointerleave', finalizeShape);
svg.addEventListener('pointerup', finalizeShape);
transformsForm.addEventListener('input', setTransform);
transformsForm.addEventListener('change', () => save('setTransform'));
transformTargetSwitch.addEventListener('change', setTransformTarget);
undoBtn.addEventListener('click', undo);
window.addEventListener('keydown', pressKey);
window.addEventListener('keyup', arrowKeyup);
window.addEventListener('DOMContentLoaded', initializeSession, { once: true });
window.addEventListener('DOMContentLoaded', initializeCanvas, { once: true });