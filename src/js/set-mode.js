import { defaults } from './constants';
import { svgTemplates } from './dom-creations';
import { save } from './drawing/drawing';
import { configClone, getRelevantConfiguredStyles } from './helper-functions';
import { addLayer } from './layers/layer-handling';
import session from './session';

export default function setMode({ target: { value } }) {
    session.mode = value;

    if (!session.activeLayer) return;

    // if the active layer isnt empty, we add (and focus) a new layer,
    // otherwise we just replace shape and mode of the current one
    if (session.activeLayer.points.length) {
        addLayer();
    } else {
        session.activeLayer.mode = session.mode;

        const shape = configClone(
            svgTemplates[session.mode],
            { 'data-layer-id': session.layerId }
        );
        const oldLayer = session.activeSVGElement;

        oldLayer.replaceWith(shape);
        oldLayer.remove();
        // remove mode-specific style-props of old mode
        Object.keys(session.activeLayer.style).forEach((key) => {
            if (
                key in defaults.styleRelevancies
                && !defaults.styleRelevancies[key].includes(session.mode)
            ) {
                delete session.activeLayer.style[key];
            }
        });
        // add mode-specific style-props of new mode
        Object.assign(session.activeLayer.style, getRelevantConfiguredStyles(session.mode));
        save('setMode');
    }
}