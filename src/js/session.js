import { cmdTags, defaults } from './constants.js';
import { remControlPoints, createControlPoints } from './control-points/control-point-handling.js';
import {
    cmdSelect,
    layers,
    modesForm,
    pathClosingToggle,
    transformTargetSwitch,
} from './dom-shared-elements.js';
import {
    applyTransforms,
    isBoolean,
} from './helper-functions.js';
import {
    setCmdConfig,
    setFillAndStrokeConfig,
    setTransformsConfig,
} from './form-handling.js';
import drawing from './drawing/drawing.js';
import layerTypes from './layers/layer-types.js';
import { setActiveLayerConfig } from './layers/active-layer-config.js';

let cmd;
let drawingShape = false;
let layerId;
let mode;
let transformLayerNotDrawing = false;
const modes = Object.keys(layerTypes);
const session = {
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
            (val === undefined && drawing.layers.length === 0)
            || (!Number.isNaN(Number(val)) && val >= 0 && val < drawing.layers.length)
        ) {
            layerId = Number(val);

            if (val === undefined) return;

            applyTransforms(drawing, session);
            remControlPoints();
            createControlPoints(session);
            setCmdConfig(session);
            setActiveLayerConfig(session.activeLayer);
            setFillAndStrokeConfig(drawing.layers[val].style);
            pathClosingToggle.checked = session.activeLayer.closePath;

            if (transformTargetSwitch.checked) {
                setTransformsConfig(drawing.layers[val].transforms);
            }
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
    },
};

window.addEventListener('DOMContentLoaded', () => {
    Object.assign(session, {
        cmd: 'M',
        layerId: drawing.layers.length ? 0 : undefined,
        mode: drawing.layers[0]?.mode || defaults.mode,
    });
}, { once: true });

export default session;