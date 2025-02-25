import {
    fillAndStrokeFields,
    outputConfig,
    transformFields,
} from './dom-selections.js';
import { complexTransforms } from './constants.js';
import { last } from './helper-functions.js';

const { elements: outputConfigFields } = outputConfig;

document.querySelectorAll('input[type="range"]').forEach((slider) => {
    slider.addEventListener('input', ({ target }) => {
        configRangeInputLabel(target, target.value);
    });
});
window.addEventListener('submit', (event) => event.preventDefault());

export {
    setCmdConfig,
    setFillAndStrokeConfig,
    setOutputConfig,
    setTransformsConfig,
};

function configInput(input, value) {
    input.value = value;

    if (input.type === 'range') {
        configRangeInputLabel(input, value);
    }
}

function configForm(formElements, conf) {
    Object.entries(conf).forEach(([key, val]) => {
        configInput(formElements[key], val);
    });
}

/** Display the value of range inputs behind their labels. */
function configRangeInputLabel(target, value) {
    target.previousElementSibling.dataset.value = ` (${value})`;
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