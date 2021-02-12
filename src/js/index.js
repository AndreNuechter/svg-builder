import './components/collapsable-fieldsets.js';
import './components/coords-display.js';
import './components/tabs.js';
import { remControlPoints, mkControlPoint } from './control-point-handling.js';
import { centerViewBox, switchToOutputTab } from './drawing.js';
import { observeLayers } from './layer-handling.js';
import {
    arcCmdConfig,
    cmdSelect,
    downloadBtn,
    drawingContent,
    layerSelect,
    modesForm,
    outputConfig,
    pathClosingToggle,
    svg,
    transformFieldSet,
    transformTargetSwitch,
    fillAndStroke
} from './dom-shared-elements.js';
import {
    addLayer,
    addPoint,
    centerRotation,
    clearDrawing,
    configArcCmd,
    configOutput,
    copyDataURIToClipboard,
    deleteLastPoint,
    initializeDrawing,
    deleteLayer,
    copyMarkupToClipboard,
    pressKey,
    reorderLayers,
    resetTransforms,
    setCmd,
    setFillOrStroke,
    setLayer,
    setMode,
    setTransform,
    setTransformTarget,
    togglePathClosing,
    triggerDownload
} from './user-actions.js';
import session from './session.js';

// watches for additions and removals of layers and does some synchronisation
new MutationObserver(observeLayers(session, remControlPoints, mkControlPoint))
    .observe(drawingContent, { childList: true });

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
document.getElementById('undo').onclick = deleteLastPoint;
document.querySelector('a[data-tab-name="output"]').onclick = switchToOutputTab;
downloadBtn.onclick = triggerDownload;
fillAndStroke.oninput = setFillOrStroke;
layerSelect.onchange = setLayer;
layerSelect.ondrop = reorderLayers;
modesForm.onchange = setMode;
outputConfig.oninput = configOutput;
pathClosingToggle.onchange = togglePathClosing;
svg.addEventListener('pointerdown', addPoint);
transformFieldSet.oninput = setTransform;
transformTargetSwitch.onchange = setTransformTarget;
window.addEventListener('DOMContentLoaded', initializeDrawing, { once: true });
window.onsubmit = (e) => e.preventDefault();
window.onkeydown = pressKey;