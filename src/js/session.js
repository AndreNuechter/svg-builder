import { cmdTags, defaults } from './constants.js';
import { remControlPoints, mkControlPoint } from './control-point-handling.js';
import {
    cmdSelect,
    modesForm,
    pathClosingToggle,
    transformTargetSwitch
} from './dom-shared-elements.js';
import {
    applyTransforms,
    setArcCmdConfig,
    setCmdConfig,
    setFillAndStrokeFields,
    setTransformsFieldset
} from './helper-functions.js';
import drawing from './drawing.js';
import layerTypes from './layer-types.js';

const modes = Object.keys(layerTypes);
const basicField = Field((val) => typeof val === 'boolean', () => {});
const proxiedSessionKeys = {
    mode: Field((val) => modes.includes(val), (val) => {
        modesForm.modes.value = val;
        document.body.dataset.mode = val;
    }),
    cmd: Field((val) => cmdTags.includes(val), (val) => {
        cmdSelect.value = val;
    }),
    layerId: LayerIdField(),
    drawingShape: basicField,
    reordering: basicField,
    transformLayerNotDrawing: basicField
};
const session = new Proxy({
    get activeLayer() {
        return drawing.layers[session.layerId];
    },
    get transformTarget() {
        return session.transformLayerNotDrawing
            ? session.activeLayer
            : drawing;
    },
    cmd: 'M',
    drawingShape: false,
    reordering: false,
    arcCmdConfig: {},
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

export default session;

/**
 * A proxied field on our session object.
 * @param { Function } validate Validates the value being assigned.
 * @param { Function } onPass Executes in addition to assigning a valid value.
 */
function Field(validate, onPass) { return { validate, onPass }; }

function LayerIdField() {
    return Field(
        (val) => (+val >= 0 && +val <= drawing.layers.length),
        (val) => {
            const cb = mkControlPoint(session.activeLayer, val);
            remControlPoints();
            drawing.layers[val].points.forEach(cb);
            pathClosingToggle.checked = session.activeLayer.closePath;
            setFillAndStrokeFields(drawing.layers[val].style);
            setArcCmdConfig(session, defaults);
            setCmdConfig(session);

            if (transformTargetSwitch.checked) {
                setTransformsFieldset(drawing.layers[val].transforms);
            }

            applyTransforms(drawing, session);
        }
    );
}