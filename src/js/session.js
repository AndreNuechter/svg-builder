/* globals document */

import { pathCmds, setArcCmdConfig } from './commands.js';
import { defaults } from './constants.js';
import { drawing } from './drawing.js';
import { remControlPoints, mkControlPoint } from './control-point-handling.js';
import setFillAndStrokeFields from './components/fill-and-stroke-syncer.js';
import { applyTransforms, setTransformsFieldset } from './transforms.js';
import { transformTargetSwitch } from './dom-shared-elements.js';

const modes = ['path', 'rect', 'ellipse']; // TODO: c. geometryProps
const cmdTags = Object.keys(pathCmds);
const proxiedKeys = {
    mode: {
        validate(val) { return modes.includes(val); },
        onPass(val) {
            // check the appropriate mode input
            document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
            document.body.className = val;
        }
    },
    cmd: {
        validate(val) { return cmdTags.includes(val); },
        onPass(val) {
            // check cmd selector
            document.querySelector(`option[value="${val}"]`).selected = true;
        }
    },
    layer: {},
    drawingShape: {
        validate(val) { return typeof val === 'boolean'; },
        onPass() {}
    },
    reordering: {
        validate(val) { return typeof val === 'boolean'; },
        onPass() {}
    },
    transformLayerNotDrawing: {
        validate(val) { return typeof val === 'boolean'; },
        onPass() {}
    }
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
    reordering: false,
    currentStyle: {}
}), {
    set(obj, key, val) {
        if (!session.keys.includes(key) || !proxiedKeys[key].validate(val)) return false;
        obj[key] = val;
        proxiedKeys[key].onPass(val);
        return true;
    }
});

// NOTE: this is added only now, cuz we need to work w session
Object.assign(proxiedKeys.layer, {
    validate(val) { return (+val >= 0 && +val <= drawing.layers.length); },
    onPass(val) {
        remControlPoints();
        drawing.layers[val].points.forEach(mkControlPoint(val));
        setFillAndStrokeFields(drawing.layers[val].style);
        setArcCmdConfig(session, defaults);
        if (transformTargetSwitch.checked) {
            setTransformsFieldset(drawing.layers[val].transforms || defaults.dims.transforms);
        }
        applyTransforms(session, defaults);
    }
});

export default session;