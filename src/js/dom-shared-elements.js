/* globals document */

const arcCmdConfig = document.getElementById('arc-cmd-config');
const controlPoints = document.getElementsByClassName('control-point');
const controlPointContainer = document.getElementById('control-point-container');
const downloadAsPngLink = document.getElementById('get-png');
const drawingContent = document.getElementById('drawing-content');
const fillAndStroke = document.getElementById('fill-and-stroke');
const layers = drawingContent.children;
const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer-selector');
const outputConfig = document.getElementById('output-configuration');
const preview = document.getElementById('preview');
const pathClosingToggle = document.getElementById('close-path-toggle');
const svg = document.getElementById('canvas');
const transformFieldSet = document.getElementById('transformations');
const transformFields = transformFieldSet.elements;
const scaleInputs = transformFields.scale.getElementsByTagName('input');
const rotateInputs = transformFields.rotate.getElementsByTagName('input');
const [transformTargetSwitch] = document.getElementsByName('transform-layer-only');

export {
    arcCmdConfig,
    controlPoints,
    controlPointContainer,
    downloadAsPngLink,
    drawingContent,
    fillAndStroke,
    layers,
    layerSelect,
    layerSelectors,
    outputConfig,
    pathClosingToggle,
    preview,
    rotateInputs,
    scaleInputs,
    svg,
    transformFields,
    transformFieldSet,
    transformTargetSwitch
};