import { cmdTags, defaults } from './constants.js';
import { remControlPoints, mkControlPoint } from './control-point-handling.js';
import {
    cmdSelect,
    drawingContent,
    layers,
    modesForm,
    pathClosingToggle,
    transformTargetSwitch
} from './dom-shared-elements.js';
import { svgTemplates } from './dom-created-elements.js';
import {
    applyTransforms,
    configClone,
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
import drawing, { toggleTimeTravelButtons } from './drawing.js';
import layerTypes from './layer-types.js';

const modes = Object.keys(layerTypes);
const basicField = Field((val) => typeof val === 'boolean', () => { });
const proxiedSessionKeys = {
    mode: Field(
        (val) => modes.includes(val),
        (val) => {
            modesForm.modes.value = val;
            document.body.dataset.mode = val;
        }
    ),
    cmd: Field(
        (val) => cmdTags.includes(val),
        (val) => {
            cmdSelect.value = val;
        }
    ),
    layerId: LayerIdField(),
    drawingShape: basicField,
    reordering: basicField,
    transformLayerNotDrawing: basicField
};
// TODO use setters instead of Proxy?
const session = new Proxy({
    get activeLayer() {
        return drawing.layers[session.layerId];
    },
    get activeSVGElement() {
        return layers[session.layerId];
    },
    get transformTarget() {
        return session.transformLayerNotDrawing
            ? session.activeLayer
            : drawing;
    },
    cmd: 'M',
    transformLayerNotDrawing: false,
    drawingShape: false,
    reordering: false,
    arcCmdConfig: { ...defaults.arcCmdConfig },
    shapeStart: {}
}, {
    set(obj, key, val) {
        const field = proxiedSessionKeys[key];
        if (!field || !field.validate(val)) return false;
        obj[key] = val;
        field.onPass(val);
        return true;
    }
});

if (drawing.layers.length) {
    session.layerId = 0;
}
session.mode = (drawing.layers[0] && drawing.layers[0].mode) || defaults.mode;

document.addEventListener('resetCanvas', initializeCanvas);
window.addEventListener('DOMContentLoaded', () => {
    initializeCanvas();
    toggleTimeTravelButtons();
}, { once: true });

export default session;

/**
 * A proxied field on our session object.
 * @param { Function } validate Validates the value being assigned.
 * @param { Function } onPass Executes in addition to assigning a valid value.
 */
function Field(validate, onPass) { return { validate, onPass }; }

function LayerIdField() {
    return Field(
        (val) => (+val >= 0 && +val < drawing.layers.length),
        (val) => {
            const cb = mkControlPoint(session.activeLayer, val);
            remControlPoints();
            drawing.layers[val].points.forEach(cb);
            pathClosingToggle.checked = session.activeLayer.closePath;
            setFillAndStrokeConfig(drawing.layers[val].style);
            setArcCmdConfig(session);
            setCmdConfig(session);

            if (transformTargetSwitch.checked) {
                setTransformsConfig(drawing.layers[val].transforms);
            }

            applyTransforms(drawing, session);
        }
    );
}

function initializeCanvas() {
    // create layer representations and config ea
    drawingContent.append(...drawing.layers.map((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const geometryProps = (layer.mode === 'path')
            ? { d: layer.points.map(pointToMarkup).join(' ') + (layer.closePath ? 'Z' : '') }
            : layer.points[0] || {};
        const attrs = {
            'data-layer-id': i,
            ...layer.style,
            ...geometryProps,
            transform: stringifyTransforms(layer.transforms)
        };

        return configClone(shape)(attrs);
    }));
    applyTransforms(drawing, session);
    setTransformsConfig(drawing.transforms);
    transformTargetSwitch.checked = session.transformLayerNotDrawing;
    setArcCmdConfig(session);
    setOutputConfig(drawing);
}