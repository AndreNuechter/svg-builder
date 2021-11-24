import { cmdTags, defaults } from './constants.js';
import { remControlPoints, mkControlPoint } from './control-point-handling.js';
import {
    cmdSelect,
    drawingContent,
    layers,
    layerSelect,
    layerSelectors,
    modesForm,
    pathClosingToggle,
    transformTargetSwitch,
    vacancyMsgStyle
} from './dom-shared-elements.js';
import { svgTemplates, layerSelectorTemplate } from './dom-created-elements.js';
import {
    applyTransforms,
    configClone,
    configElement,
    pointToMarkup,
    stringifyTransforms
} from './helper-functions.js';
import {
    setArcCmdConfig,
    setCmdConfig,
    setOutputConfig,
    setFillAndStrokeConfig,
    setTransformsConfig
} from './form-handling.js';
import drawing, { save } from './drawing.js';
import { reorderLayerSelectors } from './layer-handling.js';
import layerTypes from './layer-types.js';

const modes = Object.keys(layerTypes);
const isBoolean = (val) => typeof val === 'boolean';
let cmd;
let drawingShape = false;
let layerId;
let mode;
let transformLayerNotDrawing = false;
const session = {
    arcCmdConfig: { ...defaults.arcCmdConfig },
    get activeLayer() {
        return drawing.layers[session.layerId];
    },
    get activeSVGElement() {
        return layers[session.layerId];
    },
    get cmd() {
        return cmd;
    },
    set cmd(val) {
        const value = cmdTags.includes(val) ? val : cmdTags[0];
        cmd = value;
        cmdSelect.value = value;
    },
    get drawingShape() {
        return drawingShape;
    },
    set drawingShape(val) {
        if (isBoolean(val)) {
            drawingShape = val;
        }
    },
    get layerId() {
        return layerId;
    },
    set layerId(val) {
        if (
            (val === undefined && !drawing.layers.length)
            || (+val >= 0 && +val < drawing.layers.length)
        ) {
            layerId = val;

            if (val === undefined) return;

            remControlPoints();
            createControlPoints();
            pathClosingToggle.checked = session.activeLayer.closePath;
            setCmdConfig(session);
            setArcCmdConfig(session);
            setFillAndStrokeConfig(drawing.layers[val].style);

            if (transformTargetSwitch.checked) {
                setTransformsConfig(drawing.layers[val].transforms);
            }

            applyTransforms(drawing, session);
        }
    },
    get mode() {
        return mode;
    },
    set mode(val) {
        if (modes.includes(val)) {
            mode = val;
            modesForm.modes.value = val;
            document.body.dataset.mode = val;
        }
    },
    shapeStart: {},
    get transformLayerNotDrawing() {
        return transformLayerNotDrawing;
    },
    set transformLayerNotDrawing(val) {
        if (isBoolean(val)) {
            transformLayerNotDrawing = val;
        }
    },
    get transformTarget() {
        return (session.transformLayerNotDrawing
            ? session.activeLayer
            : drawing).transforms;
    }
};

document.addEventListener('initializeCanvas', initializeCanvas);
window.addEventListener('DOMContentLoaded', () => {
    Object.assign(session, {
        cmd: 'M',
        layerId: drawing.layers.length ? 0 : undefined,
        mode: drawing.layers[0]?.mode || defaults.mode
    });
    initializeCanvas();
}, { once: true });

export default session;
export { addLayerSelector, deleteLayerSelectors, initializeCanvas };

const dragLayerSelector = (event) => {
    event.dataTransfer.setData('text', event.target.dataset.layerId);
    event.dataTransfer.effectAllowed = 'move';
};
const changeLayerLabel = ({ target }) => {
    // NOTE: since you have to click on the label to edit it,
    // the edited label belongs to the active layer
    session.activeLayer.label = target.textContent.replace(/\n/g, /\s/).trim();
    save('changeLabel');
};

function createControlPoints() {
    if (!session.activeLayer) return;
    const cb = mkControlPoint(session.activeLayer, session.layerId);
    session.activeLayer.points.forEach(cb);
}

function addLayerSelector(id = layerSelect.childElementCount) {
    const layerSelector = layerSelectorTemplate.cloneNode(true);
    const [label, selector] = layerSelector.children;
    layerSelector.dataset.layerId = id;
    layerSelector.ondragstart = dragLayerSelector;
    label.oninput = changeLayerLabel;
    configElement(label, {
        textContent: (drawing.layers[id] && drawing.layers[id].label)
            || `Layer ${id + 1}`
    });
    configElement(selector, {
        value: id,
        checked: session.layerId === layerSelectors.length
    });
    layerSelect.append(layerSelector);
    reorderLayerSelectors(id);
    vacancyMsgStyle.display = 'none';
}

function deleteLayerSelectors() {
    vacancyMsgStyle.display = drawingContent.childElementCount ? 'none' : 'initial';

    while (layerSelect.childElementCount !== layers.length) {
        layerSelect.lastChild.remove();
    }

    if (!layers.length) {
        session.layerId = undefined;
    } else if (session.layerId === layers.length) {
        session.layerId -= 1;
    } else {
        // NOTE: quickfix for undoing deletion
        // TODO: restore active layer?!...in resetCanvas()?
        if (session.layerId === undefined) {
            session.layerId = 0;
        }

        const cb = mkControlPoint(session.activeLayer, session.layerId);
        setFillAndStrokeConfig(session.activeLayer.style);
        reorderLayerSelectors(session.layerId);
        session.activeLayer.points.forEach(cb);
        session.mode = session.activeLayer.mode;
    }

    // check the active layer's selector
    if (layerSelectors[session.layerId]) {
        layerSelectors[session.layerId].checked = true;
    }
}

function initializeCanvas() {
    // clear canvas
    remControlPoints();
    [...layers].forEach((l) => l.remove());
    deleteLayerSelectors();
    // populate canvas
    createControlPoints();
    drawingContent.append(...drawing.layers.map((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const geometryProps = (layer.mode === 'path')
            ? {
                d: `${layer.points.map(pointToMarkup).join(' ')}${layer.closePath
                    ? 'Z'
                    : ''}`
            }
            : layer.points[0] || {};
        return configClone(shape)({
            'data-layer-id': i,
            ...layer.style,
            ...geometryProps,
            transform: stringifyTransforms(layer.transforms)
        });
    }));
    drawing.layers.forEach((_, i) => addLayerSelector(i));
    // adjust ui-elements
    pathClosingToggle.checked = session.activeLayer && session.activeLayer.closePath;
    setCmdConfig(session);
    applyTransforms(drawing, session);
    setTransformsConfig(session.transformTarget);
    transformTargetSwitch.checked = session.transformLayerNotDrawing;
    setFillAndStrokeConfig(session.activeLayer?.style || defaults.style);
    setArcCmdConfig(session);
    setOutputConfig(drawing);
}