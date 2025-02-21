import { cpCountPerCmd } from '../control-points/control-point-types';
import { activeLayerConfigForm, controlPoints } from '../dom-shared-elements';
import { save } from '../drawing/drawing';
import session from '../session';
import { drawLayer } from './layer-handling';

// TODO impl adding a point (between earlier ones)...by click between two configs? plus btn on bottom outline?...
// TODO impl moving a point up/down

const ellipseConfig = document.getElementById('ellipse-config');
const ellipseConfigCx = ellipseConfig.querySelector('[name=cx]');
const ellipseConfigCy = ellipseConfig.querySelector('[name=cy]');
const ellipseConfigRx = ellipseConfig.querySelector('[name=rx]');
const ellipseConfigRy = ellipseConfig.querySelector('[name=ry]');
const rectConfig = document.getElementById('rect-config');
const rectConfigCx = rectConfig.querySelector('[name=x]');
const rectConfigCy = rectConfig.querySelector('[name=y]');
const rectConfigWidth = rectConfig.querySelector('[name=width]');
const rectConfigHeight = rectConfig.querySelector('[name=height]');
const pathCmdConfigsContainer = document.getElementById('path-config__cmds');
const pathCmdTmpls = {
    L: document.getElementById('l-cmd-config-tmpl').content,
    Q: document.getElementById('q-cmd-config-tmpl').content,
    M: document.getElementById('m-cmd-config-tmpl').content,
    C: document.getElementById('c-cmd-config-tmpl').content,
    S: document.getElementById('s-cmd-config-tmpl').content,
    T: document.getElementById('t-cmd-config-tmpl').content,
    V: document.getElementById('v-cmd-config-tmpl').content,
    H: document.getElementById('h-cmd-config-tmpl').content,
    A: document.getElementById('a-cmd-config-tmpl').content,
};

activeLayerConfigForm.addEventListener('change', () => save('changed active layer via fieldset'));
activeLayerConfigForm.addEventListener('input', configActiveLayer);
activeLayerConfigForm.addEventListener('click', deletePathPoint);

export { setActiveLayerConfig };

function deletePathPoint({ target }) {
    if (!target.classList.contains('cmd-config__delete-point-btn')) return;

    const pointId = Number(target.parentElement.dataset.pointId);
    const firstCpAt = Number(target.parentElement.dataset.firstCpAt);
    const cpCount = cpCountPerCmd[session.activeLayer.points[pointId].cmd];

    // splice out point-data
    session.activeLayer.points.splice(pointId, 1);
    save('deleted point');

    // rm the related config fieldset
    target.parentElement.remove();

    // update the dataset on the following configs
    [...pathCmdConfigsContainer.children].slice(pointId).forEach((configFieldset, index) => {
        configFieldset.dataset.pointId = pointId + index;
        configFieldset.dataset.firstCpAt = Number(configFieldset.dataset.firstCpAt) - cpCount;
    });

    // rm related cps
    for (
        let index = firstCpAt, end = firstCpAt + cpCount;
        index < end;
        index += 1
    ) {
        controlPoints[firstCpAt].remove();
    }

    // TODO possibly rm the slopes

    // redraw the path
    drawLayer(session.layerId);
}

// TODO is called twice on start...why? once when setting the current layer and again when canvas is initialized...can we change that?
function setActiveLayerConfig(activeLayer = session.activeLayer) {
    if (!activeLayer) return;

    if (activeLayer.mode === 'path') {
        let indexOfFirstCP = 0;
        // TODO this could be optimized to not thrash the dom as frequently (update instead of create anew...)
        // add the relevant config for ea cmd in this path
        pathCmdConfigsContainer.replaceChildren(
            ...activeLayer.points.map((point, pointId) => {
                // create the relevant config
                // NOTE: we use the firstElementChild, to get out the document fragment
                const newConfig = pathCmdTmpls[point.cmd].cloneNode(true).firstElementChild;

                // remember the cmd's position within the path
                newConfig.dataset.pointId = pointId;
                // note at which index the first cp related to this "point"/cmd is
                newConfig.dataset.firstCpAt = indexOfFirstCP;
                // increase the index of the first cp of the following cmd by the amount of cps this cmd has
                indexOfFirstCP += cpCountPerCmd[point.cmd];

                // sync the config
                switch (point.cmd) {
                    case 'M':
                    case 'L':
                    case 'T':
                        newConfig.querySelector('[name=x]').value = point.x;
                        newConfig.querySelector('[name=y]').value = point.y;
                        break;
                    case 'Q':
                    case 'S':
                        newConfig.querySelector('[name=x]').value = point.x;
                        newConfig.querySelector('[name=y]').value = point.y;
                        newConfig.querySelector('[name=x1]').value = point.x1;
                        newConfig.querySelector('[name=y1]').value = point.y1;
                        break;
                    case 'C':
                        newConfig.querySelector('[name=x]').value = point.x;
                        newConfig.querySelector('[name=y]').value = point.y;
                        newConfig.querySelector('[name=x1]').value = point.x1;
                        newConfig.querySelector('[name=y1]').value = point.y1;
                        newConfig.querySelector('[name=x2]').value = point.x2;
                        newConfig.querySelector('[name=y2]').value = point.y2;
                        break;
                    case 'V':
                        newConfig.querySelector('[name=y]').value = point.y;
                        break;
                    case 'H':
                        newConfig.querySelector('[name=x]').value = point.x;
                        break;
                    case 'A':
                        newConfig.querySelector('[name=x]').value = point.x;
                        newConfig.querySelector('[name=y]').value = point.y;
                        newConfig.querySelector('[name=xR]').value = point.xR;
                        newConfig.querySelector('[name=yR]').value = point.yR;
                        newConfig.querySelector('[name=large]').checked = point.large;
                        newConfig.querySelector('[name=sweep]').checked = point.sweep;
                        newConfig.querySelector('[name=xRot]').value = point.xRot;
                }

                return newConfig;
            })
        );

        return;
    }

    const firstPoint = activeLayer.points[0] || {};

    switch (activeLayer.mode) {
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
    }
}

function configActiveLayer({ target }) {
    if (session.activeLayer.mode === 'path') {
        const cmdConfig = target.closest('.cmd-config');

        if (cmdConfig === null) return;

        let { pointId, firstCpAt } = cmdConfig.dataset;
        pointId = Number(pointId);
        firstCpAt = Number(firstCpAt);

        const point = session.activeLayer.points[pointId];

        // update the data
        point[target.name] = target.type === 'checkbox'
            ? Number(target.checked)
            : Number(target.value);
        // update the svg element
        drawLayer(session.layerId);
        // update the cps (up to 3 depending on the cmd)
        // NOTE: we calculated the position of the first cp in setActiveLayerConfig
        // furthermore, we know from mkControlPoint that a cmd's mainCp is always the last to be added to the dom
        switch (target.name) {
            case 'x':
                controlPoints[firstCpAt + cpCountPerCmd[point.cmd] - 1].setAttribute('cx', point.x);

                // if the next cmd exists and is a V cmd we need to also update its cp
                if (session.activeLayer.points[pointId + 1]?.cmd === 'V') {
                    controlPoints[firstCpAt + cpCountPerCmd[point.cmd]].setAttribute('cx', point.x);
                }

                break;
            case 'y':
                controlPoints[firstCpAt + cpCountPerCmd[point.cmd] - 1].setAttribute('cy', point.y);

                // if the next cmd exists and is a H cmd we need to also update its cp
                if (session.activeLayer.points[pointId + 1]?.cmd === 'H') {
                    controlPoints[firstCpAt + cpCountPerCmd[point.cmd]].setAttribute('cy', point.y);
                }

                break;
            case 'x1':
                controlPoints[firstCpAt].setAttribute('cx', point.x1);
                break;
            case 'y1':
                controlPoints[firstCpAt].setAttribute('cy', point.y1);
                break;
            case 'x2':
                controlPoints[firstCpAt + 1].setAttribute('cx', point.x2);
                break;
            case 'y2':
                controlPoints[firstCpAt + 1].setAttribute('cy', point.y2);
                break;
        }

        return;
    }

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
    }
}