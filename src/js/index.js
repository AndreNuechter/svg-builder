import './components/collapsable-fieldsets.js';
import './components/coords-display.js';
import './components/tabs.js';
import session from './session.js';
import { remControlPoints, mkControlPoint } from './control-point-handling.js';
import { centerViewBox, switchToOutputTab } from './drawing.js';
import { observeLayers } from './layer-handling.js';
import {
    arcCmdConfig,
    cmdSelect,
    downloadBtn,
    drawingContent,
    layerSelect,
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
    dataURIToClipboard,
    deleteLastPoint,
    initializeDrawing,
    deleteLayer,
    markupToClipboard,
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

// watches for additions and removals of layers and does some synchronisation
new MutationObserver(observeLayers(session, remControlPoints, mkControlPoint))
    .observe(drawingContent, { childList: true });

window.addEventListener('DOMContentLoaded', initializeDrawing, { once: true });
window.onsubmit = e => e.preventDefault();
window.onkeydown = pressKey;
layerSelect.onchange = setLayer;
layerSelect.ondrop = reorderLayers;
pathClosingToggle.onchange = togglePathClosing;
arcCmdConfig.oninput = configArcCmd;
fillAndStroke.oninput = setFillOrStroke;
transformTargetSwitch.onchange = setTransformTarget;
transformFieldSet.oninput = setTransform;
outputConfig.oninput = configOutput;
downloadBtn.onclick = triggerDownload;
svg.addEventListener('pointerdown', addPoint);
cmdSelect.onchange = setCmd;
document.getElementById('modes').onchange = setMode;
document.getElementById('reset-transforms').onclick = resetTransforms;
document.getElementById('get-markup').onclick = markupToClipboard;
document.getElementById('get-data-uri').onclick = dataURIToClipboard;
document.getElementById('center-rotation-btn').onclick = centerRotation;
document.getElementById('center-vb').onclick = centerViewBox;
document.getElementById('add-layer').onclick = addLayer;
document.getElementById('del-layer').onclick = deleteLayer;
document.getElementById('clear-all').onclick = clearDrawing;
document.getElementById('undo').onclick = deleteLastPoint;
document.querySelector('a[data-tab-name="output"]').onclick = switchToOutputTab;