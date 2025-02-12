import { activeLayerConfigForm, controlPoints } from '../dom-shared-elements';
import { save } from '../drawing/drawing';
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
const rectConfig = document.querySelector('#rect-config');
const rectConfigCx = rectConfig.querySelector('[name=x]');
const rectConfigCy = rectConfig.querySelector('[name=y]');
const rectConfigWidth = rectConfig.querySelector('[name=width]');
const rectConfigHeight = rectConfig.querySelector('[name=height]');

activeLayerConfigForm.addEventListener('change', () => save('changed via fieldset'));
activeLayerConfigForm.addEventListener('input', configActiveLayer);

export {
    setActiveLayerConfig,
};

function setActiveLayerConfig(activeLayer = session.activeLayer) {
    const firstPoint = activeLayer?.points[0] || {};

    switch (activeLayer?.mode) {
        case 'ellipse':
            ellipseConfigCx.value = firstPoint.cx || 0;
            ellipseConfigCy.value = firstPoint.cy || 0;
            ellipseConfigRx.value = firstPoint.rx || 0;
            ellipseConfigRy.value = firstPoint.ry || 0;
            break;
        case 'rect':
            rectConfigCx.value = firstPoint.x || 0;
            rectConfigCy.value = firstPoint.y || 0;
            rectConfigWidth.value = firstPoint.width || 0;
            rectConfigHeight.value = firstPoint.height || 0;
            break;
        case 'path':
            // TODO impl me
            break;
    }
}

function configActiveLayer({ target }) {
    const firstPoint = session.activeLayer.points[0];

    switch (session.activeLayer.mode) {
        case 'ellipse':
            // update the data
            firstPoint[target.name] = Number(target.value);
            // update the svg element
            session.activeSVGElement.setAttribute(target.name, target.value);
            // update the cps
            // NOTE: control-point-handling/mkControlPoint tells us that 3 cps are added for an ellipse, center first, then rx and then ry
            // changing cx or cy via the form affects all 3 cps (center, rx and ry); changing rx or ry affect only rx or ry
            switch (target.name) {
                case 'rx':
                    controlPoints[1].setAttribute('cx', firstPoint.cx - firstPoint.rx);
                    break;
                case 'ry':
                    controlPoints[2].setAttribute('cy', firstPoint.cy - firstPoint.ry);
                    break;
                case 'cx':
                    // move all controlPoints horizontally
                    controlPoints[0].setAttribute('cx', firstPoint.cx);
                    controlPoints[1].setAttribute('cx', firstPoint.cx - firstPoint.rx);
                    controlPoints[2].setAttribute('cx', firstPoint.cx);
                    break;
                case 'cy':
                    // move all controlPoints vertically
                    controlPoints[0].setAttribute('cy', firstPoint.cy);
                    controlPoints[1].setAttribute('cy', firstPoint.cy);
                    controlPoints[2].setAttribute('cy', firstPoint.cy - firstPoint.ry);
                    break;
            }

            break;
        case 'rect':
            // update the data
            firstPoint[target.name] = Number(target.value);
            // update the svg element
            session.activeSVGElement.setAttribute(target.name, target.value);
            // update the cps
            // NOTE: control-point-handling/mkControlPoint tells us that 2 cps are added for a rect, first top-left (which changes position) and then bottom-right (which changes width and/or height)
            // changing x or y via the form affects both cps; changing width or height affects only the bottom-right one
            switch (target.name) {
                case 'x':
                    controlPoints[0].setAttribute('cx', firstPoint.x);
                    controlPoints[1].setAttribute('cx', firstPoint.x + firstPoint.width);
                    break;
                case 'y':
                    controlPoints[0].setAttribute('cy', firstPoint.y);
                    controlPoints[1].setAttribute('cy', firstPoint.y + firstPoint.height);
                    break;
                case 'width':
                    controlPoints[1].setAttribute('cx', firstPoint.x + firstPoint.width);
                    break;
                case 'height':
                    controlPoints[1].setAttribute('cy', firstPoint.y + firstPoint.height);
                    break;
            }

            break;
        case 'path':
            // TODO impl me
            break;
    }
}