import './components/collapsable-fieldsets.js';
import './components/coords-display.js';
import './components/tabs.js';
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

arcCmdConfig.oninput = configArcCmd;
cmdSelect.onchange = setCmd;
document.getElementById('reset-transforms').onclick = resetTransforms;
document.getElementById('get-markup').onclick = copyMarkupToClipboard;
document.getElementById('get-data-uri').onclick = copyDataURIToClipboard;
document.getElementById('center-rotation-btn').onclick = centerRotation;
document.getElementById('center-vb').onclick = centerViewBox;
document.getElementById('add-layer').onclick = addLayer;
document.getElementById('del-layer').onclick = deleteLayer;
document.getElementById('clear-all').onclick = clearDrawing;
document.getElementById('del-last-point').onclick = deleteLastPoint;
document.getElementById('duplicate-layer').onclick = duplicateLayer;
document.querySelector('a[data-linked-tab="output"]').onclick = switchToOutputTab;
downloadBtn.onclick = triggerDownload;
fillAndStrokeForm.oninput = setFillOrStroke;
layerSelect.onchange = setLayer;
layerSelect.ondrop = reorderLayers;
modesForm.onchange = setMode;
outputConfig.oninput = configOutput;
pathClosingToggle.onchange = togglePathClosing;
redoBtn.addEventListener('click', redo);
svg.onwheel = changeBackgroundGridSize;
svg.addEventListener('pointerdown', addPoint);
svg.addEventListener('pointerleave', finalizeShape);
document.addEventListener('pointerup', finalizeShape);
transformsForm.oninput = setTransform;
transformTargetSwitch.onchange = setTransformTarget;
undoBtn.addEventListener('click', undo);
window.onkeydown = pressKey;