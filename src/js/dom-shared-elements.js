/** @type { HTMLFormElement } */
const arcCmdConfig = document.getElementById('arc-cmd-config');
const cmdSelect = document.getElementById('commands');
const controlPoints = document.getElementsByClassName('control-point');
const controlPointContainer = document.getElementById('control-point-container');
const downloadBtn = document.getElementById('download-btn');
const drawingContent = document.getElementById('drawing-content');
/** @type { HTMLFormElement } */
const fillAndStroke = document.getElementById('fill-and-stroke');
const layers = drawingContent.children;
const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer-selector');
/** @type { HTMLFormElement } */
const outputConfig = document.getElementById('output-configuration');
const modesForm = document.getElementById('modes');
const preview = document.getElementById('preview');
const pathClosingToggle = document.getElementById('close-path-toggle');
/** @type { SVGSVGElement } */
const svg = document.getElementById('canvas');
const transformFieldSet = document.getElementById('transformations');
const transformFields = transformFieldSet.elements;
const scaleInputs = transformFields.scale.getElementsByTagName('input');
const rotateInputs = transformFields.rotate.getElementsByTagName('input');
const [transformTargetSwitch] = document.getElementsByName('transform-layer-only');

export {
    arcCmdConfig,
    cmdSelect,
    controlPoints,
    controlPointContainer,
    downloadBtn,
    drawingContent,
    fillAndStroke,
    layers,
    layerSelect,
    layerSelectors,
    outputConfig,
    modesForm,
    pathClosingToggle,
    preview,
    rotateInputs,
    scaleInputs,
    svg,
    transformFields,
    transformFieldSet,
    transformTargetSwitch
};