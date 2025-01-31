import { activeLayerConfigForm } from '../dom-shared-elements';

// TODO check again if we can get rid of .on eventHandlers

/*
    this form should hold a set of inputs that model the sessions active layer.

    for a rect, there should be 4 inputs (x, y, width and height, w and h cant be negative; maybe rx too?)
    for an ellipse, there should be 2 (rx and ry)
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

export {
    setActiveLayerConfig,
};

activeLayerConfigForm.addEventListener('change', () => {

});

function setActiveLayerConfig() {
    // TODO impl me
    console.log('config layerConfig');
}