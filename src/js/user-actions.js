/* globals window, document */

import { getNonDefaultStyles } from './fill-and-stroke.js';
import session from './session.js';
import drawing, { generateMarkUp, save, setOutputConfiguration } from './drawing.js';
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
    configElement,
    getSVGCoords,
    pointToMarkup,
    saveCloneObj,
    setTransformsFieldset,
    stringifyTransforms
} from './helper-functions.js';
import { svgTemplates } from './dom-created-elements.js';
import {
    drawingContent,
    layers,
    layerSelectors,
    pathClosingToggle,
    preview,
    svg,
    transformTargetSwitch
} from './dom-shared-elements.js';
import layerTypes from './layer-types.js';
import { mkControlPoint, remControlPoints, remLastControlPoint } from './control-point-handling.js';
import {
    arc,
    getLastArcCmd,
    setArcCmdConfig
} from './path-commands.js';

export {
    addLayer,
    addPoint,
    centerRotation,
    centerViewBox,
    clearDrawing,
    configArcCmd,
    configOutput,
    deleteLastPoint,
    deleteLayer,
    initializeDrawing,
    markupToClipboard,
    pressKey,
    reorderLayers,
    resetTransforms,
    setCenterOfRotation,
    setCmd,
    setFillOrStroke,
    setLayer,
    setMode,
    setTransformTarget,
    setTransform,
    togglePathClosing
};

function addLayer() {
    // TODO: it might be better to just read all fields here, since now styling done before layer exists, is lost again
    const untrackedStyle = getNonDefaultStyles(session.mode);

    // add new vanilla layer-data and set session-focus to it
    session.layer = drawing
        .layers
        .push(Layer(
            session.mode,
            Object.assign({}, defaults.style, untrackedStyle),
            saveCloneObj(defaults.transforms)
        )) - 1;
    save();

    const shape = configClone(svgTemplates[session.mode])({
        'data-layer-id': session.layer
    });

    drawingContent.append(shape);
}

function addPoint(event) {
    if (!layers.length) addLayer();

    const [x, y] = getSVGCoords(event);
    const { points } = session.current;

    if (session.drawingShape) {
        const size = {
            hor: Math.abs(session.shapeStart.x - x),
            vert: Math.abs(session.shapeStart.y - y)
        };
        const attrs = session.mode === 'rect'
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
        mkControlPoint(session.current, session.layer)(
            points[points.length - 1],
            points.length - 1
        );
        session.drawingShape = false;
        svg.onpointermove = null;
    } else {
        layerTypes[session.mode]
            .mkPoint(session, points, x, y, mkControlPoint, remLastControlPoint);
    }

    styleLayer(session.layer);
    drawLayer(session.layer);
}

function deleteLastPoint() {
    if (!session.current) return;

    const latestPoint = session.current.points.pop();

    if (!latestPoint) return;

    if (latestPoint.cmd) {
        remLastControlPoint(latestPoint.cmd);
        drawLayer(session.layer);
    } else {
        const layer = layers[session.layer];
        const steadyAttrs = ['data-layer-id', 'transform'];

        remControlPoints();
        layer.getAttributeNames()
            .filter(n => !steadyAttrs.includes(n))
            .forEach(n => layer.removeAttribute(n));

        save();
    }
}

function deleteLayer() {
    if (!layers.length) return;
    drawing.layers.splice(session.layer, 1);
    save();
    layers[session.layer].remove();
}

function configArcCmd({ target }) {
    const prop = (target.type === 'checkbox') ? 'checked' : 'value';
    session.arcCmdConfig[target.name] = target[prop];

    if (!session.current) return;

    const lastArcCmd = getLastArcCmd(session.current.points) || {};
    const updateData = Object.assign({}, defaults.arcCmdConfig, session.arcCmdConfig);

    Object.assign(lastArcCmd, arc(updateData));
    drawLayer(session.layer);
}

function centerViewBox() {
    const {
        x,
        y,
        width,
        height
    } = drawingContent.getBBox();

    drawing.outputDims['vb-min-x'] = Math.trunc(x);
    drawing.outputDims['vb-min-y'] = Math.trunc(y);
    drawing.outputDims['vb-width'] = Math.trunc(width);
    drawing.outputDims['vb-height'] = Math.trunc(height);

    updateViewBox();
    setOutputConfiguration();
}

function updateViewBox() {
    configElement(preview.firstElementChild, {
        width: drawing.outputDims.width,
        height: drawing.outputDims.height,
        viewBox: drawing.viewBox,
        preserveAspectRatio: [drawing.outputDims.ratio, drawing.outputDims['slice-or-meet']].join(' ')
    });
}

function configOutput({ target }) {
    drawing.outputDims[target.name] = target.value;
    save();
    updateViewBox();
}

function markupToClipboard() { window.navigator.clipboard.writeText(generateMarkUp()); }

function pressKey(event) {
    if (window.location.hash !== '#drawing') return;

    const { key } = event;

    if (moves[key]) {
        event.preventDefault();

        if (!event.ctrlKey && !session.current) return;

        const { transforms: { translate: transformTarget } } = event.ctrlKey
            ? drawing
            : session.current;
        const { cb, prop } = moves[key];

        transformTarget[prop] = cb(transformTarget[prop]);
        applyTransforms(drawing, session);
    }

    // prevent interference w eg custom labeling
    if (document.activeElement !== document.body) return;

    if (key === 'Backspace') {
        event.preventDefault();
        deleteLastPoint();
    } else if (!event.ctrlKey && cmdTags.includes(key.toUpperCase())) {
        event.preventDefault();
        session.cmd = key.toUpperCase();
    }
}

function clearDrawing() {
    window.localStorage.removeItem('drawing');
    drawing.layers.length = 0;
    drawing.outputDims = Object.assign({}, defaults.outputDims);
    drawing.transforms = saveCloneObj(defaults.transforms);
    [...layers].forEach(layer => layer.remove());
}

function togglePathClosing() {
    if (!drawing.layers[session.layer]) return;

    drawing.layers[session.layer].closePath = pathClosingToggle.checked;
    drawLayer(session.layer);
}

function setFillOrStroke({ target }) {
    if (!drawing.layers[session.layer]) return;

    drawing.layers[session.layer].style[target.name] = target.value;
    styleLayer(session.layer);
}

function setTransformTarget({ target }) {
    if (target.checked) {
        setTransformsFieldset(session.current
            ? session.current.transforms
            : defaults.transforms);
    } else {
        setTransformsFieldset(drawing.transforms);
    }

    session.transformLayerNotDrawing = target.checked;
}

function setTransform({ target }) {
    const transformTarget = session.transformLayerNotDrawing
        ? session.current
        : drawing;

    // NOTE: 'rotate' and scale have more than one param
    if (target.classList.contains('transform-config')) {
        transformTarget.transforms[target.dataset.transform][+target.dataset.id] = target.value;
    } else {
        transformTarget.transforms[target.name] = target.value;
    }

    save();
    applyTransforms(drawing, session);
}

function resetTransforms() {
    const { transforms } = defaults;

    if (transformTargetSwitch.checked && session.current) {
        session.current.transforms = saveCloneObj(transforms);
    } else {
        drawing.transforms = saveCloneObj(transforms);
    }

    save();
    applyTransforms(drawing, session);
    setTransformsFieldset(transforms);
}

function centerRotation() {
    const args = session.transformLayerNotDrawing
        ? [layers[session.layer], session.current.transforms]
        : [svg.firstElementChild, drawing.transforms];

    setCenterOfRotation(...args);
    applyTransforms(drawing, session);
    save();
}

function initializeDrawing() {
    // if there's a saved drawing, use it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing')) || {};
    Object.assign(drawing, {
        outputDims: src.outputDims || Object.assign({}, defaults.outputDims),
        transforms: src.transforms || saveCloneObj(defaults.transforms),
        layers: src.layers || []
    });

    session.mode = (drawing.layers[0] && drawing.layers[0].mode)
        ? drawing.layers[0].mode
        : defaults.mode;

    // initialize session.layer or reset arc-cmd-config
    if (drawing.layers.length) {
        session.layer = 0;
        pathClosingToggle.checked = session.current.closePath;
    }
    // set selected cmd
    document.querySelector('option[value="M"]').selected = true;

    // create layer representations and config ea
    drawing.layers.forEach((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const attrs = Object.assign({ 'data-layer-id': i }, layer.mode === 'path'
            ? { d: layer.points.map(pointToMarkup).join(' ') + (layer.closePath ? 'Z' : '') }
            : layer.points[0]
            || {}, layer.style, { transform: stringifyTransforms(layer.transforms) });

        drawingContent.append(configClone(shape)(attrs));
    });

    applyTransforms(drawing, session);
    setTransformsFieldset(drawing.transforms || defaults.transforms);
    transformTargetSwitch.checked = false;
    setArcCmdConfig(session, defaults);
    setOutputConfiguration();
}

function reorderLayers(event) {
    const droppedOnSelector = event.target.closest('label');
    const droppedOnId = +droppedOnSelector.dataset.layerId;
    const droppedOnLayer = layers[droppedOnId];
    const draggedId = +event.dataTransfer.getData('text');
    const draggedLayer = layers[draggedId];

    // re-order the layer data
    const [draggedLayerData] = drawing.layers.splice(draggedId, 1);
    drawing.layers.splice(droppedOnId, 0, draggedLayerData);
    save();

    // insert dragged before or after the one dropped on depending on its origin
    if (draggedId < droppedOnId) {
        droppedOnLayer.after(draggedLayer);
    } else {
        drawingContent.insertBefore(draggedLayer, droppedOnLayer);
    }

    // NOTE: we want the active layer to remain active,
    // so we may have to add or subtract 1 from session.layer or
    // set the id to the one dropped on
    if (draggedId !== session.layer) {
        if (draggedId > session.layer && droppedOnId <= session.layer) {
            session.layer += 1;
        } else if (draggedId < session.layer && droppedOnId > session.layer) {
            session.layer -= 1;
        }
    } else {
        session.layer = droppedOnId;
    }

    reorderLayerSelectors(Math.min(draggedId, droppedOnId), Math.max(draggedId, droppedOnId));
    layerSelectors[session.layer].checked = true;
    session.reordering = true;
    event.preventDefault();
}

function setCmd({ target }) { session.cmd = cmdTags[cmdTags.indexOf(target.value)] || cmdTags[0]; }

function setMode({ target }) {
    if (session.drawingShape) {
        session.mode = session.mode;
        return;
    }

    session.mode = target.value;

    if (!layers[session.layer]) return;

    // NOTE: if we change the mode on an existing layer, we add a new layer,
    // but if it has not been edited yet, we replace the shape and the mode
    if (session.current.points.length) {
        addLayer();
    } else {
        session.current.mode = session.mode;
        const shape = configClone(svgTemplates[session.mode])({
            'data-layer-id': session.layer
        });
        drawingContent.replaceChild(shape, layers[session.layer]);
        // remove non-default props of old layer
        Object.keys(session.current.style).forEach((key) => {
            if (defaults.style[key] === undefined) delete session.current.style[key];
        });
        // add non-default props for new layer
        Object.assign(session.current.style, getNonDefaultStyles(session.mode));
    }
}

function setLayer({ target }) {
    const layerId = +target.value;
    session.mode = drawing.layers[layerId].mode;
    session.layer = layerId;
}

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
}