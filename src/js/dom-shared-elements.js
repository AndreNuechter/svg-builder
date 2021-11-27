/** @type { HTMLFormElement } */
const arcCmdConfig = document.getElementById('arc-cmd-config');
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
const svg = document.getElementById('canvas');
const transformsForm = document.getElementById('transformations');
const transformFields = transformsForm.elements;
const rotateInputs = transformFields.rotate.getElementsByTagName('input');
const scaleInputs = transformFields.scale.getElementsByTagName('input');
const [transformTargetSwitch] = document.getElementsByName('transform-layer-only');
const undoBtn = document.getElementById('undo-btn');
const vacancyMsgStyle = document.getElementById('no-layer-msg').style;

export {
    arcCmdConfig,
    cmdSelect,
    controlPoints,
    controlPointContainer,
    downloadBtn,
    drawingContent,
    fillAndStrokeForm,
    fillAndStrokeFields,
    layers,
    layerSelect,
    layerSelectors,
    outputConfig,
    modesForm,
    pathClosingToggle,
    preview,
    redoBtn,
    rotateInputs,
    scaleInputs,
    svg,
    transformFields,
    transformsForm,
    transformTargetSwitch,
    undoBtn,
    vacancyMsgStyle,
};