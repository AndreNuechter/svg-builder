/* globals document */

const arcCmdConfig = document.getElementById('arc-cmd-config');
const controlPoints = document.getElementsByClassName('control-point');
const controlPointContainer = document.getElementById('control-point-container');
const drawingContent = document.getElementById('drawing-content');
const fillAndStroke = document.getElementById('fill-and-stroke');
const layers = drawingContent.children;
const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer-selector');
const outputConfig = document.getElementById('output-configuration');
const preview = document.getElementById('preview');
const svg = document.getElementById('canvas');
const transformFields = document.getElementById('transformations');
const [transformTargetSwitch] = document.getElementsByName('transform-layer-only');

export {
    arcCmdConfig,
    controlPoints,
    controlPointContainer,
    drawingContent,
    fillAndStroke,
    layers,
    layerSelect,
    layerSelectors,
    outputConfig,
    preview,
    svg,
    transformFields,
    transformTargetSwitch
};