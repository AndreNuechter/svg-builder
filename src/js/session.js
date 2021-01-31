import { cmdTags, defaults } from './constants.js';
import drawing from './drawing.js';
import { remControlPoints, mkControlPoint } from './control-point-handling.js';
import { cmdSelect, pathClosingToggle, transformTargetSwitch } from './dom-shared-elements.js';
import layerTypes from './layer-types.js';
import {
    applyTransforms,
    setArcCmdConfig,
    setCmdConfig,
    setFillAndStrokeFields,
    setTransformsFieldset
} from './helper-functions.js';

const modes = Object.keys(layerTypes);
const basicField = Field(val => typeof val === 'boolean', () => {});
const proxiedSessionKeys = {
    mode: Field(val => modes.includes(val), (val) => {
        // check the appropriate mode input
        document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
        document.body.dataset.mode = val;
    }),
    cmd: Field(val => cmdTags.includes(val), (val) => {
        cmdSelect.value = val;
    }),
    layer: LayerField(),
    drawingShape: basicField,
    reordering: basicField,
    transformLayerNotDrawing: basicField
};
const session = new Proxy({
    get current() {
        return drawing.layers[session.layer];
    },
    keys: Object.keys(proxiedSessionKeys),
    cmd: 'M',
    drawingShape: false,
    reordering: false,
    arcCmdConfig: {},
    shapeStart: {}
}, {
    set(obj, key, val) {
        if (!session.keys.includes(key) || !proxiedSessionKeys[key].validate(val)) return false;
        obj[key] = val;
        proxiedSessionKeys[key].onPass(val);
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

function LayerField() {
    return Field(
        val => (+val >= 0 && +val <= drawing.layers.length),
        (val) => {
            const cb = mkControlPoint(session.current, val);
            remControlPoints();
            drawing.layers[val].points.forEach(cb);
            pathClosingToggle.checked = session.current.closePath;
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