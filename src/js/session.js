/* globals document */

import { cmdTags, defaults } from './constants.js';
import drawing from './drawing.js';
import { remControlPoints, mkControlPoint } from './control-point-handling.js';
import { pathClosingToggle, transformTargetSwitch } from './dom-shared-elements.js';
import layerTypes from './layer-types.js';
import {
    applyTransforms,
    setArcCmdConfig,
    setFillAndStrokeFields,
    setTransformsFieldset
} from './helper-functions.js';

const modes = Object.keys(layerTypes);
const basicField = Field(val => typeof val === 'boolean', () => {});
const proxiedKeys = {
    mode: Field(val => modes.includes(val), (val) => {
        // check the appropriate mode input
        document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
        document.body.dataset.mode = val;
    }),
    cmd: Field(val => cmdTags.includes(val), (val) => {
        // check cmd selector
        document.querySelector(`option[value="${val}"]`).selected = true;
    }),
    layer: {},
    drawingShape: basicField,
    reordering: basicField,
    transformLayerNotDrawing: basicField
};
const session = new Proxy(Object.assign({
    get current() {
        return drawing.layers[session.layer];
    },
    keys: Object.keys(proxiedKeys)
}, {
    cmd: 'M',
    arcCmdConfig: {},
    drawingShape: false,
    shapeStart: {},
    reordering: false
}), {
    set(obj, key, val) {
        if (!session.keys.includes(key) || !proxiedKeys[key].validate(val)) return false;
        obj[key] = val;
        proxiedKeys[key].onPass(val);
        return true;
    }
});

// NOTE: this is added only now, since we need to work w session
Object.assign(proxiedKeys.layer,
    Field(
        val => (+val >= 0 && +val <= drawing.layers.length),
        (val) => {
            const cb = mkControlPoint(session.current, val);
            remControlPoints();
            drawing.layers[val].points.forEach(cb);
            pathClosingToggle.checked = session.current.closePath;
            setFillAndStrokeFields(drawing.layers[val].style);
            setArcCmdConfig(session, defaults);
            if (transformTargetSwitch.checked) {
                setTransformsFieldset(drawing.layers[val].transforms);
            }
            applyTransforms(drawing, session);
        }
    ));

export default session;

function Field(validate, onPass) { return { validate, onPass }; }