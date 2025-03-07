import {
    fillAndStrokeFields,
} from './dom-selections.js';
import { configForm, configRangeInputLabel, last } from './helper-functions.js';

document.querySelectorAll('input[type="range"]').forEach((slider) => {
    slider.addEventListener('input', ({ target }) => {
        configRangeInputLabel(target, target.value);
    });
});
window.addEventListener('submit', (event) => event.preventDefault());

export {
    setCmdConfig,
    setFillAndStrokeConfig,
};

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