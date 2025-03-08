import { fillAndStrokeFields } from './dom-selections';
import { configForm } from './helper-functions';
import { styleLayer } from './layers/layer-handling';
import session from './session';

export {
    setFillAndStrokeConfig,
    setFillOrStroke,
};

/**
 * Adjusts the Fill & Stroke fieldset to a given style config.
 * @param { Object } style The config to be applied.
 */
function setFillAndStrokeConfig(style) {
    configForm(fillAndStrokeFields, style);
}

function setFillOrStroke({ target: { name, value } }) {
    if (!session.activeLayer) return;

    session.activeLayer.style[name] = value;

    // NOTE: make sure a change in fill is visible to the user
    if (name === 'fill' && session.activeLayer.style['fill-opacity'] === '0') {
        session.activeLayer.style['fill-opacity'] = '1';
    }

    styleLayer(session.layerId);
}