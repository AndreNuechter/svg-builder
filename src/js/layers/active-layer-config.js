import { activeLayerConfigForm } from '../dom-shared-elements';
import { save } from '../drawing/drawing';
import { configElement } from '../helper-functions';
import session from '../session';

// TODO check again if we can get rid of .on eventHandlers
// FIXME UI doesnt keep up when switching between projects (eg loading another mode when in path mode)

/*
    this form should hold a set of inputs that model the sessions active layer.

    for a rect, there should be 4 inputs (x, y, width and height, w and h cant be negative; maybe rx too?)
    for an ellipse, there should be 4 (cx, cy, rx and ry)
    and for a path, there should be as much inputs as the path has cmds (
        cmds would have differing # of inputs:
        M 2 (x and y)
        L 2 (x and y)
        Q 4 (x, x1, y and y1)
        C 6 (x, x1, x2, y, y1 and y2)
        S 4 (x, x1, y and y1)
        T 2 (x and y)
        V 1 (y)
        H 1 (x)
        A 7 (x, xRad, xRot, y, yRad, large and sweep; the last two are flags [0, 1])
    ) the form should have a max-height and scroll when it gets too large

    for pathes, there should be a way to add a point to a path at any position (not before the first M tho)
    and there should be a way to delete any point (except the first M) (for example an x-btn after the line)

    the changes should become visible oninput but only saved onchange
*/

const ellipseConfig = document.querySelector('#ellipse-config');
const ellipseConfigCx = ellipseConfig.querySelector('[name=cx]');
const ellipseConfigCy = ellipseConfig.querySelector('[name=cy]');
const ellipseConfigRx = ellipseConfig.querySelector('[name=rx]');
const ellipseConfigRy = ellipseConfig.querySelector('[name=ry]');

activeLayerConfigForm.addEventListener('change', () => save('changed via fieldset'));
activeLayerConfigForm.addEventListener('input', updateActiveLayer);

export {
    setActiveLayerConfig,
};

function setActiveLayerConfig(activeLayer) {
    // TODO impl me (for now just finish the ellipse case)...is called when session.layerId changes. when else should it be called? when changing the activelayer, eg when dragging a cp
    console.log('config layerConfig', activeLayer);

    if (activeLayer.mode === 'ellipse') {
        const { cx = 0, cy = 0, rx = 0, ry = 0 } = activeLayer.points[0] || {};

        ellipseConfigCx.value = cx;
        ellipseConfigCy.value = cy;
        ellipseConfigRx.value = rx;
        ellipseConfigRy.value = ry;
    }
}

function updateActiveLayer({ target }) {
    // TODO impl me
    console.log('update', target);

    if (session.activeLayer.mode === 'ellipse') {
        session.activeLayer.points[0][target.name] = Number(target.value);
        configElement(session.activeSVGElement, { [target.name]: Number(target.value) });
        // TODO update the cps...changing cx or cy affects all 3 cps (center, rx and ry); rx or cy affect only the center...
    }
}