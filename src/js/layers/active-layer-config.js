import { updateControlPoints } from '../control-points/control-point-handling';
import { cpCountPerCmd } from '../control-points/control-point-types';
import { activeLayerConfigForm, controlPoints } from '../dom-shared-elements';
import { save } from '../drawing/drawing';
import session from '../session';
import { drawLayer } from './layer-handling';
import { cmdsThatShouldNotRepeat, cmdsWithCpsDependingOnThePreviousCmd, mkDefaultPoint } from './path-commands';

// FIXME undo/redo doesnt work well with this...configs arent restored or removed

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
activeLayerConfigForm.addEventListener('click', addOrDeletePathPoint);

export { setActiveLayerConfig };

/** Handle clicks on the buttons in the path config fieldsets. */
function addOrDeletePathPoint({ target }) {
    if (target.classList.contains('cmd-config__add-point-btn')) {
        addPathPoint(target.parentElement);
    } else if (target.classList.contains('cmd-config__delete-point-btn')) {
        deletePathPoint(target.parentElement);
    } else {
        return;
    }

    // redraw cps and slopes
    updateControlPoints(session);

    // redraw the path
    drawLayer(session.layerId);
}

/** Add a cmd to a path via the fieldset. */
function addPathPoint(previousConfig) {
    const points = session.activeLayer.points;
    const pointId = Number(previousConfig.dataset.pointId);
    const prevPoint = points[pointId];

    // prevent repeated M, V or H cmds
    if (prevPoint.cmd === session.cmd && cmdsThatShouldNotRepeat.has(session.cmd)) return;

    let prevPointData;

    if (cmdsWithCpsDependingOnThePreviousCmd.has(session.cmd)) {
        prevPointData = (() => {
            switch (prevPoint.cmd) {
                case 'V':
                    return { y: prevPoint.y, x: points[pointId - 1].x };
                case 'H':
                    return { x: prevPoint.x, y: points[pointId - 1].y };
                default:
                    return prevPoint;
            }
        })();
    }

    // create a new point
    // TODO use sensible defaults for x and y instead of 0, 0 (avg between this point and the next?)
    const newPoint = Object.assign({ cmd: session.cmd }, mkDefaultPoint(session.cmd, 0, 0, prevPointData));

    // add the new point to this layer after the one belonging to the config clicked on
    points.splice(pointId + 1, 0, newPoint);
    save('added point via fieldset');

    // add a new cmd config after the one clicked on
    const newConfig = mkPathCmdConfig(session.cmd);
    setPathCmdConfig(
        newConfig,
        newPoint,
        {
            pointId: pointId + 1,
            firstCpAt: Number(previousConfig.dataset.firstCpAt) + cpCountPerCmd[prevPoint.cmd]
        }
    );
    previousConfig.after(newConfig);

    // update the dataset on the following configs
    [...pathCmdConfigsContainer.children].slice(pointId).forEach((configFieldset, index) => {
        configFieldset.dataset.pointId = pointId + index + 1;
        configFieldset.dataset.firstCpAt = Number(configFieldset.dataset.firstCpAt) + cpCountPerCmd[session.cmd];
    });
}

/** Update the active layer after input in the fieldset. */
function configActiveLayer({ target }) {
    if (session.activeLayer.mode === 'path') {
        configPathLayer(target);
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
            // NOTE: control-point-handling/mkControlPoints tells us that 3 cps are added for an ellipse, center first, then rx and then ry
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
            }

            break;
        case 'rect':
            // update the data
            firstPoint[target.name] = Number(target.value);
            // update the svg element
            session.activeSVGElement.setAttribute(target.name, target.value);
            // update the cps
            // NOTE: control-point-handling/mkControlPoints tells us that 2 cps are added for a rect, first top-left (which changes position) and then bottom-right (which changes width and/or height)
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
            }
    }
}

/** Handle input into a path related input. */
function configPathLayer(updatedInput) {
    const cmdConfig = updatedInput.closest('.cmd-config');

    if (cmdConfig === null) return;

    let { pointId, firstCpAt } = cmdConfig.dataset;
    pointId = Number(pointId);
    firstCpAt = Number(firstCpAt);

    const point = session.activeLayer.points[pointId];

    // update the data
    point[updatedInput.name] = updatedInput.type === 'checkbox'
        ? Number(updatedInput.checked)
        : Number(updatedInput.value);
    // update the svg element
    drawLayer(session.layerId);
    // update the cps (up to 3 depending on the cmd)
    // NOTE: we calculated the position of the first cp in setActiveLayerConfig
    // furthermore, we know from mkControlPoints that a cmd's mainCp is always the last to be added to the dom
    switch (updatedInput.name) {
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
}

/** Delete a cmd from a path via a fieldset. */
function deletePathPoint(configOfRemovedPoint) {
    const points = session.activeLayer.points;
    const pointId = Number(configOfRemovedPoint.dataset.pointId);
    const cmd = points[pointId].cmd;
    const cpCount = cpCountPerCmd[cmd];

    // splice out point-data
    points.splice(pointId, 1);
    save('deleted point');

    // rm the related config fieldset
    configOfRemovedPoint.remove();

    // update the dataset on the following configs
    [...pathCmdConfigsContainer.children].slice(pointId).forEach((configFieldset, index) => {
        configFieldset.dataset.pointId = pointId + index;
        configFieldset.dataset.firstCpAt = Number(configFieldset.dataset.firstCpAt) - cpCount;
    });
}

/** Create a fieldset to configure a given path cmd. */
function mkPathCmdConfig(cmd) {
    // NOTE: we use the firstElementChild to get out the document fragment
    return pathCmdTmpls[cmd].cloneNode(true).firstElementChild;
}

// TODO is called twice on start...why? once when setting the current layer and again when canvas is initialized...can we change that?
/** Represent the active layer in the fieldset. */
function setActiveLayerConfig(activeLayer = session.activeLayer) {
    if (!activeLayer) return;

    if (activeLayer.mode === 'path') {
        let indexOfFirstCP = 0;
        // TODO this could be optimized to not thrash the dom as frequently (update instead of create anew...)
        // add a config for ea cmd in this path, replacing existing ones
        pathCmdConfigsContainer.replaceChildren(
            ...activeLayer.points.map((point, pointId) => {
                // create the config
                const newConfig = mkPathCmdConfig(point.cmd);

                // sync the config w this point
                // NOTE: we remember the cmd's position within the path and at which index the first cp related to this "point"/cmd is
                setPathCmdConfig(newConfig, point, { pointId, firstCpAt: indexOfFirstCP });
                // increase the index of the first cp of the following cmd by the amount of cps this cmd has
                indexOfFirstCP += cpCountPerCmd[point.cmd];

                return newConfig;
            })
        );

        return;
    }

    // NOTE: ellipse or rect layers have only one point
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

/** Represent one path cmd in a fieldset. */
function setPathCmdConfig(config, point, dataset) {
    switch (point.cmd) {
        case 'M':
        case 'L':
        case 'T':
            config.querySelector('[name=x]').value = point.x;
            config.querySelector('[name=y]').value = point.y;
            break;
        case 'Q':
        case 'S':
            config.querySelector('[name=x]').value = point.x;
            config.querySelector('[name=y]').value = point.y;
            config.querySelector('[name=x1]').value = point.x1;
            config.querySelector('[name=y1]').value = point.y1;
            break;
        case 'C':
            config.querySelector('[name=x]').value = point.x;
            config.querySelector('[name=y]').value = point.y;
            config.querySelector('[name=x1]').value = point.x1;
            config.querySelector('[name=y1]').value = point.y1;
            config.querySelector('[name=x2]').value = point.x2;
            config.querySelector('[name=y2]').value = point.y2;
            break;
        case 'V':
            config.querySelector('[name=y]').value = point.y;
            break;
        case 'H':
            config.querySelector('[name=x]').value = point.x;
            break;
        case 'A':
            config.querySelector('[name=x]').value = point.x;
            config.querySelector('[name=y]').value = point.y;
            config.querySelector('[name=xR]').value = point.xR;
            config.querySelector('[name=yR]').value = point.yR;
            config.querySelector('[name=large]').checked = point.large;
            config.querySelector('[name=sweep]').checked = point.sweep;
            config.querySelector('[name=xRot]').value = point.xRot;
    }

    Object.assign(config.dataset, dataset);
}