import {
    arcCmdConfig,
    fillAndStrokeFields,
    outputConfig,
    transformFields,
} from './dom-shared-elements.js';
import { complexTransforms } from './constants.js';
import { last, getLastArcCmd } from './helper-functions.js';

const { elements: outputConfigFields } = outputConfig;
// display the value of range inputs behind their labels
const configRangeInputLabel = (target, value) => {
    target.previousElementSibling.dataset.value = ` (${value})`;
};
const configInput = (input, value) => {
    input.value = value;
    if (input.type === 'range') {
        configRangeInputLabel(input, value);
    }
};
const configForm = (formElements, conf) => {
    Object.entries(conf).forEach(([key, val]) => {
        configInput(formElements[key], val);
    });
};

[...document.querySelectorAll('input[type="range"]')].forEach((slider) => {
    slider.addEventListener('input', ({ target }) => {
        configRangeInputLabel(target, target.value);
    });
});
window.onsubmit = (e) => e.preventDefault();

export {
    setArcCmdConfig,
    setCmdConfig,
    setFillAndStrokeConfig,
    setOutputConfig,
    setTransformsConfig,
};

/**
 * Sets the fields of the arc-cmd-config-form and possibly assigns the active layer's last a-cmd's config to session-arc-cmd-config.
 * @param { Object } session The session object.
 */
function setArcCmdConfig(session) {
    if (session.mode !== 'path') return;

    const conf = (session.activeLayer && getLastArcCmd(session.activeLayer.points)) || session.arcCmdConfig;

    Object.assign(session.arcCmdConfig, conf);
    Object.entries(conf)
        // NOTE: the data might be coming from a point,
        // so we filter out props not shared between a point and the form
        .filter(([key]) => !['cmd', 'x', 'y'].includes(key))
        .forEach(([key, val]) => {
            const field = arcCmdConfig.elements[key];

            if (field.type === 'checkbox') {
                field.checked = val;
            } else {
                configInput(field, val);
            }
        });
}

function setCmdConfig(session) {
    if (!session.activeLayer || session.activeLayer.mode !== 'path') return;

    session.cmd = session.activeLayer.points.length
        ? last(session.activeLayer.points).cmd
        : 'M';
}

/**
 * Adjusts the Fill & Stroke fieldset to a given style config.
 * @param { Object } style The config to be applied.
 */
function setFillAndStrokeConfig(style) {
    configForm(fillAndStrokeFields, style);
}

/**
 * Adjusts the Output configuration fieldset to a given config.
 * @param { Object } conf The config for the output. Expected to be gotten from `drawing`.
 */
function setOutputConfig({ outputConfig: conf }) {
    configForm(outputConfigFields, conf);
}

/**
 * Adjusts the transform-related inputs to a given config.
 * @param { Object } conf The config to be applied.
 */
function setTransformsConfig(conf) {
    Object.entries(conf)
        // NOTE: we manage translations via arrow-keys and not via the form
        .filter(([key]) => key !== 'translate')
        .forEach(([key, val]) => {
            if (complexTransforms[key]) {
                val.forEach((v, i) => configInput(complexTransforms[key][i], v));
            } else {
                configInput(transformFields[key], val);
            }
        });
}