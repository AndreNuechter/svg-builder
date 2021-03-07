import {
    drawLayer,
    Layer,
    reorderLayerSelectors,
    styleLayer
} from './layer-handling.js';
import {
    cmdTags,
    complexTransforms,
    defaults,
    moves
} from './constants.js';
import {
    applyTransforms,
    configClone,
    getLastArcCmd,
    getNonDefaultStyles,
    getSVGCoords,
    cloneObj,
    last,
    lastId
} from './helper-functions.js';
import { setTransformsConfig } from './form-handling.js';
import {
    canvas,
    downloadLink,
    dummyImg,
    svgTemplates
} from './dom-created-elements.js';
import {
    controlPointContainer,
    drawingContent,
    fillAndStrokeForm,
    layers,
    layerSelectors,
    pathClosingToggle,
    svg,
    transformsForm,
    transformTargetSwitch
} from './dom-shared-elements.js';
import { mkControlPoint, remControlPoints, remLastControlPoint } from './control-point-handling.js';
import { arc } from './path-commands.js';
import drawing, {
    centerViewBox,
    generateDataURI,
    generateMarkUp,
    updateViewBox,
    redo,
    save,
    switchToOutputTab,
    undo
} from './drawing.js';
import session from './session.js';
import layerTypes from './layer-types.js';

const steadyAttrs = ['data-layer-id', 'transform'];
const ctx = canvas.getContext('2d');
const download = (url) => {
    Object.assign(downloadLink, {
        download: `My_SVG.${drawing.outputConfig['file-format']}`,
        href: url
    });
    downloadLink.click();
};
const writeToClipboard = (text) => window.navigator.clipboard.writeText(text);
const ctrlActions = {
    C: duplicateLayer,
    Z: undo,
    Y: redo
};

// NOTE: save when done translating/inputting transforms
window.onkeyup = ({ key }) => {
    if (moves[key]) {
        save('keyup');
    }
};
transformsForm.onchange = () => save('setTransform');

export {
    addLayer,
    addPoint,
    centerRotation,
    centerViewBox,
    clearDrawing,
    configArcCmd,
    configOutput,
    copyDataURIToClipboard,
    copyMarkupToClipboard,
    deleteLastPoint,
    deleteLayer,
    duplicateLayer,
    pressKey,
    redo,
    reorderLayers,
    resetTransforms,
    setCenterOfRotation,
    setCmd,
    setFillOrStroke,
    setLayer,
    setMode,
    setTransform,
    setTransformTarget,
    switchToOutputTab,
    togglePathClosing,
    triggerDownload,
    undo
};

// TODO drawing?
function addLayer() {
    // TODO: it might be better to just read all fields here, since now styling done before layer exists, is lost again
    const untrackedStyle = getNonDefaultStyles(session.mode);

    // add new vanilla layer-data and set session-focus to it
    drawing.layers.push(Layer(
        session.mode,
        { ...defaults.style, ...untrackedStyle },
        cloneObj(defaults.transforms)
    ));
    session.layerId = lastId(drawing.layers);

    const shape = configClone(svgTemplates[session.mode])({
        'data-layer-id': session.layerId
    });

    drawingContent.append(shape);
}

// TODO drawing?
function addPoint(event) {
    if (!layers.length) addLayer();

    const [x, y] = getSVGCoords(event);
    const { points } = session.activeLayer;

    if (session.drawingShape) {
        const size = {
            hor: Math.abs(session.shapeStart.x - x),
            vert: Math.abs(session.shapeStart.y - y)
        };
        const attrs = (session.mode === 'rect')
            ? {
                x: Math.min(session.shapeStart.x, x),
                y: Math.min(session.shapeStart.y, y),
                width: size.hor,
                height: size.vert
            }
            : {
                rx: size.hor,
                ry: size.vert
            };

        Object.assign(points[0], attrs);
        save('drawShape');

        mkControlPoint(session.activeLayer, session.layerId)(
            last(points),
            lastId(points)
        );
        session.drawingShape = false;
        svg.onpointermove = null;
    } else {
        layerTypes[session.mode].mkPoint(session, points, x, y, mkControlPoint, remLastControlPoint);

        // start dragging newly created path-point
        if (session.mode === 'path') {
            controlPointContainer.lastElementChild.dispatchEvent(new Event('pointerdown'));
        }
    }

    styleLayer(session.layerId);
    drawLayer(session.layerId);
}

function centerRotation() {
    const args = session.transformLayerNotDrawing
        ? [session.activeSVGElement, session.activeLayer.transforms]
        : [svg.firstElementChild, drawing.transforms];

    setCenterOfRotation(...args);
    applyTransforms(drawing, session);
}

// TODO mv to drawing
function clearDrawing() {
    drawing.layers.length = 0;
    drawing.outputConfig = { ...defaults.outputConfig };
    drawing.transforms = cloneObj(defaults.transforms);
    [...layers].forEach((layer) => layer.remove());
    save('clear');
}

// TODO mv to formhandling
function configArcCmd({ target }) {
    const prop = (target.type === 'checkbox') ? 'checked' : 'value';
    session.arcCmdConfig[target.name] = target[prop];

    if (!session.activeLayer) return;

    const lastArcCmd = getLastArcCmd(session.activeLayer.points);

    if (!lastArcCmd) return;

    Object.assign(lastArcCmd, arc(session.arcCmdConfig));
    drawLayer(session.layerId);
    save('configArcCmd');
}

// TODO mv to formhandling
function configOutput({ target: { name, value } }) {
    drawing.outputConfig[name] = value;
    updateViewBox();
    save('configOutput');
}

function copyDataURIToClipboard() {
    writeToClipboard(generateDataURI());
}

function copyMarkupToClipboard() {
    writeToClipboard(generateMarkUp());
}

// TODO drawing?
// TODO is there still a need for this?...it works even after refreshing...
function deleteLastPoint() {
    if (!session.activeLayer?.points.length) return;

    const latestPoint = session.activeLayer.points.pop();

    save('deleteLastPoint');

    // NOTE: if the latest point has no cmd-prop it's either a rect or a circle
    if (latestPoint.cmd) {
        remLastControlPoint(latestPoint.cmd);
        drawLayer(session.layerId);
    } else {
        const layer = session.activeSVGElement;

        remControlPoints();
        layer.getAttributeNames()
            .filter((n) => !steadyAttrs.includes(n))
            .forEach((n) => layer.removeAttribute(n));
    }
}

// TODO drawing?
function deleteLayer() {
    if (!layers.length) return;
    drawing.layers.splice(session.layerId, 1);
    session.activeSVGElement.remove();
    save('deleteLayer');
}

// TODO drawing?
function duplicateLayer() {
    // NOTE: add a copy of the current layer after it and focus it
    const layerData = cloneObj(session.activeLayer);
    const layerRepresentation = session.activeSVGElement.cloneNode(true);
    drawing.layers.splice(session.layerId, 0, layerData);
    session.activeSVGElement.after(layerRepresentation);
    [...layers].forEach((l, i) => { l.dataset.layerId = i; });
    session.layerId += 1;
    save('ctrl+c');
}

function pressKey(event) {
    if (window.location.hash !== '#drawing') return;

    const { key } = event;

    if (key === 'F12') return;

    // exit label editing by pressing enter
    if (key === 'Enter' && event.target.contentEditable) event.target.blur();

    // prevent interference w eg custom labeling
    if (document.activeElement !== document.body) return;

    const move = moves[key];

    if (event.ctrlKey && ctrlActions[key.toUpperCase()]) {
        ctrlActions[key.toUpperCase()]();
    } else if (move) {
        if (!session.activeLayer && !event.ctrlKey) return;

        const { transforms: { translate: transformTarget } } = event.ctrlKey
            ? drawing
            : session.activeLayer;
        const { cb, prop } = move;

        transformTarget[prop] = cb(+transformTarget[prop]);
        applyTransforms(drawing, session);
    } else if (key === 'Backspace') {
        deleteLastPoint();
    } else if (cmdTags.includes(key.toUpperCase())) {
        session.cmd = key.toUpperCase();
    }

    event.preventDefault();
}

// TODO layer-handling?
function reorderLayers(event) {
    const droppedOnSelector = event.target.closest('label');
    const droppedOnId = +droppedOnSelector.dataset.layerId;
    const droppedOnLayer = layers[droppedOnId];
    const draggedId = +event.dataTransfer.getData('text');
    const draggedLayer = layers[draggedId];

    // re-order the layer data
    const [draggedLayerData] = drawing.layers.splice(draggedId, 1);
    drawing.layers.splice(droppedOnId, 0, draggedLayerData);
    save('reorderLayer');

    // insert dragged before or after the one dropped on depending on its origin
    if (draggedId < droppedOnId) {
        droppedOnLayer.after(draggedLayer);
    } else {
        drawingContent.insertBefore(draggedLayer, droppedOnLayer);
    }

    // we want the active layer to remain active,
    // so we may have to add or subtract 1 to/from session.layerId or
    // set the id to the one dropped on
    if (draggedId !== session.layerId) {
        if (draggedId > session.layerId && droppedOnId <= session.layerId) {
            session.layerId += 1;
        } else if (draggedId < session.layerId && droppedOnId > session.layerId) {
            session.layerId -= 1;
        }
    } else {
        session.layerId = droppedOnId;
    }

    reorderLayerSelectors(Math.min(draggedId, droppedOnId), Math.max(draggedId, droppedOnId));
    layerSelectors[session.layerId].checked = true;
    session.reordering = true;
    event.preventDefault();
}

// TODO mv to formhandling
function resetTransforms() {
    const { transforms } = defaults;

    if (transformTargetSwitch.checked && session.activeLayer) {
        session.activeLayer.transforms = cloneObj(transforms);
    } else {
        drawing.transforms = cloneObj(transforms);
    }

    applyTransforms(drawing, session);
    setTransformsConfig(transforms);
    save('resetTransforms');
}

// TODO mv to formhandling
function setCenterOfRotation(element, transformTarget) {
    const {
        x,
        y,
        width,
        height
    } = element.getBBox();
    const coords = [Math.trunc(x + width * 0.5), Math.trunc(y + height * 0.5)];

    [complexTransforms.rotate[1].value, complexTransforms.rotate[2].value] = coords;
    [transformTarget.rotate[1], transformTarget.rotate[2]] = coords;
    save('setCenterofRotation');
}

// TODO mv to formhandling
function setCmd({ target }) {
    session.cmd = cmdTags[cmdTags.indexOf(target.value)] || cmdTags[0];
}

// TODO mv to formhandling
function setFillOrStroke({ target: { name, value } }) {
    if (!session.activeLayer) return;

    session.activeLayer.style[name] = value;
    styleLayer(session.layerId);
}
fillAndStrokeForm.onchange = () => save('setFillOrStroke');

// TODO mv to formhandling
function setLayer({ target: { value } }) {
    const layerId = +value;
    session.mode = drawing.layers[layerId].mode;
    session.layerId = layerId;
}

// TODO mv to formhandling
function setMode({ target, currentTarget }) {
    if (session.drawingShape) {
        currentTarget.modes.value = session.mode;
        return;
    }

    session.mode = target.value;

    if (!session.activeSVGElement) return;

    // NOTE: if we change the mode on an existing layer, we add a new layer,
    // but if it has not yet been edited, we replace the shape and the mode
    if (session.activeLayer.points.length) {
        addLayer();
    } else {
        session.activeLayer.mode = session.mode;
        const shape = configClone(svgTemplates[session.mode])({
            'data-layer-id': session.layerId
        });
        const oldLayer = session.activeSVGElement;
        oldLayer.replaceWith(shape);
        oldLayer.remove();
        // remove non-default style-props of old layer
        Object.keys(session.activeLayer.style).forEach((key) => {
            if (defaults.style[key] === undefined) delete session.activeLayer.style[key];
        });
        // add non-default style-props to new layer
        Object.assign(session.activeLayer.style, getNonDefaultStyles(session.mode));
        save('setMode');
    }
}

// TODO mv to formhandling
function setTransform({ target: { classList, dataset, name, value } }) {
    // NOTE: 'rotate' and 'scale' have more than one param
    if (classList.contains('transform-config')) {
        const { transform, id } = dataset;
        session.transformTarget.transforms[transform][+id] = value;
    } else {
        session.transformTarget.transforms[name] = value;
    }

    applyTransforms(drawing, session);
}

// TODO mv to formhandling
function setTransformTarget({ target: { checked } }) {
    if (checked) {
        setTransformsConfig(session.activeLayer
            ? session.activeLayer.transforms
            : defaults.transforms);
    } else {
        setTransformsConfig(drawing.transforms);
    }

    session.transformLayerNotDrawing = checked;
}

// TODO mv to formhandling
function togglePathClosing() {
    if (!session.activeLayer) return;

    session.activeLayer.closePath = pathClosingToggle.checked;
    drawLayer(session.layerId);
    save('togglePathClosing');
}

function triggerDownload() {
    const svgDataURI = generateDataURI();

    if (drawing.outputConfig['file-format'] === 'svg') {
        download(svgDataURI);
    } else {
        dummyImg.src = svgDataURI;
        dummyImg.onload = () => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            Object.assign(ctx.canvas, {
                width: drawing.outputConfig.width,
                height: drawing.outputConfig.height
            });
            ctx.drawImage(dummyImg, 0, 0);
            download(canvas.toDataURL());
        };
    }
}