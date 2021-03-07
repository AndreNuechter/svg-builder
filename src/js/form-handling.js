import {
    arcCmdConfig,
    fillAndStrokeFields,
    outputConfig,
    transformFields
} from './dom-shared-elements.js';
import { complexTransforms } from './constants.js';
import { last, getLastArcCmd } from './helper-functions.js';

const { elements: outputConfigFields } = outputConfig;
const configForm = (formElements, conf) => {
    Object.entries(conf).forEach(([key, val]) => {
        formElements[key].value = val;
    });
};

window.onsubmit = (e) => e.preventDefault();

export {
    setArcCmdConfig,
    setCmdConfig,
    setFillAndStrokeConfig,
    setOutputConfig,
    setTransformsConfig
};

/**
 * Sets the fields of the arc-cmd-config-form and possibly assigns the active layer's last a-cmd's config to session-arc-cmd-config.
 * @param { Object } session The session object.
 */
function setArcCmdConfig(session) {
    if (session.mode !== 'path') return;

    const conf = (session.activeLayer && getLastArcCmd(session.activeLayer.points)) || session.arcCmdConfig;

    // TODO is it necessary to mutate session here? Why is this on session and not on layer level? Is the config shared between layers?!... it doesnt make sense on a layer level since there might be multiple a cmds in a layer, ea w differing configs, BUT that doesnt mean it makes sense here
    // this is executed on layer-change and start-up...
    Object.assign(session.arcCmdConfig, conf);
    Object.entries(conf)
        // NOTE: the data might be coming from a point,
        // so we filter out props not shared between a point and the form
        .filter(([key]) => !['cmd', 'x', 'y'].includes(key))
        .forEach(([key, val]) => {
            const field = arcCmdConfig.elements[key];
            field[(field.type === 'checkbox') ? 'checked' : 'value'] = val;
        });
}

function setCmdConfig(session) {
    if (session.activeLayer.mode !== 'path') return;

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
                val.forEach((v, i) => { complexTransforms[key][i].value = v; });
            } else {
                transformFields[key].value = val;
            }
        });
}