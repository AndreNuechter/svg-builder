const cmdSelect = document.getElementById('commands');
const controlPoints = document.getElementsByClassName('control-point');
const controlPointContainer = document.getElementById('control-point-container');
const downloadBtn = document.getElementById('download-btn');
const drawingContent = document.getElementById('drawing-content');
/** @type { HTMLFormElement } */
const fillAndStrokeForm = document.getElementById('fill-and-stroke');
const { elements: fillAndStrokeFields } = fillAndStrokeForm;
const layers = drawingContent.children;
const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer-selector');
/** @type { HTMLFormElement } */
const outputConfig = document.getElementById('output-configuration');
const modesForm = document.getElementById('modes');
const preview = document.getElementById('preview');
const pathClosingToggle = document.getElementById('close-path-toggle');
const redoBtn = document.getElementById('redo-btn');
/** @type { SVGSVGElement } */
const svg = document.getElementById('svg-canvas');
const transformsForm = document.getElementById('transformations');
const transformFields = transformsForm.elements;
const rotateInputs = transformFields.rotate.getElementsByTagName('input');
const translateInputs = transformFields.translate.getElementsByTagName('input');
const scaleInputs = transformFields.scale.getElementsByTagName('input');
const slopes = controlPointContainer.getElementsByTagName('line');
const [transformTargetSwitch] = document.getElementsByName('transform-layer-only');
const undoBtn = document.getElementById('undo-btn');
const vacancyMsgStyle = document.getElementById('no-layer-msg').style;
const startNewDrawingBtn = document.getElementById('start-new-drawing-btn');
const loadDrawingBtn = document.getElementById('load-drawing-btn');
const deleteDrawingBtn = document.getElementById('delete-drawing-btn');
const projectManagementOverlay = document.getElementById('project-management-overlay');
const drawingSelection = document.getElementById('select-drawing-form').querySelector('select');
const drawingTitle = document.getElementById('drawing-title');
const activeLayerConfigForm = document.getElementById('active-layer-config');

export {
    activeLayerConfigForm,
    cmdSelect,
    controlPoints,
    controlPointContainer,
    deleteDrawingBtn,
    downloadBtn,
    drawingContent,
    drawingTitle,
    fillAndStrokeForm,
    fillAndStrokeFields,
    layers,
    layerSelect,
    layerSelectors,
    loadDrawingBtn,
    outputConfig,
    modesForm,
    pathClosingToggle,
    preview,
    redoBtn,
    rotateInputs,
    projectManagementOverlay,
    drawingSelection,
    scaleInputs,
    slopes,
    svg,
    startNewDrawingBtn,
    transformFields,
    transformsForm,
    transformTargetSwitch,
    translateInputs,
    undoBtn,
    vacancyMsgStyle,
};