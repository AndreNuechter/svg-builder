import './components/collapsable-fieldsets.js';
import './components/coords-display.js';
import './components/tabs.js';
import './project-management.js';
import {
    arcCmdConfig,
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
    addLayer,
    addPoint,
    centerRotation,
    centerViewBox,
    changeBackgroundGridSize,
    clearDrawing,
    configArcCmd,
    configOutput,
    copyDataURIToClipboard,
    deleteLastPoint,
    deleteLayer,
    finalizeShape,
    copyMarkupToClipboard,
    pressKey,
    redo,
    reorderLayers,
    resetTransforms,
    setCmd,
    setFillOrStroke,
    setLayer,
    setMode,
    setTransform,
    setTransformTarget,
    switchToOutputTab,
    togglePathClosing,
    triggerDownload,
    undo,
    duplicateLayer,
} from './user-actions.js';

arcCmdConfig.addEventListener('input', configArcCmd);
cmdSelect.addEventListener('change', setCmd);
document.getElementById('reset-transforms').addEventListener('click', resetTransforms);
document.getElementById('get-markup').addEventListener('click', copyMarkupToClipboard);
document.getElementById('get-data-uri').addEventListener('click', copyDataURIToClipboard);
document.getElementById('center-rotation-btn').addEventListener('click', centerRotation);
document.getElementById('center-vb').addEventListener('click', centerViewBox);
document.getElementById('add-layer').addEventListener('click', addLayer);
document.getElementById('del-layer').addEventListener('click', deleteLayer);
document.getElementById('clear-all').addEventListener('click', clearDrawing);
document.getElementById('del-last-point').addEventListener('click', deleteLastPoint);
document.getElementById('duplicate-layer').addEventListener('click', duplicateLayer);
document.querySelector('a[data-linked-tab="output"]').addEventListener('click', switchToOutputTab);
downloadBtn.addEventListener('click', triggerDownload);
fillAndStrokeForm.addEventListener('input', setFillOrStroke);
layerSelect.addEventListener('change', setLayer);
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
transformTargetSwitch.addEventListener('change', setTransformTarget);
undoBtn.addEventListener('click', undo);
window.addEventListener('keydown', pressKey);