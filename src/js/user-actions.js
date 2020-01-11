/* globals window, document */

import session from './session.js';
import drawing, {
    generateDataURI,
    generateMarkUp,
    updateViewBox,
    save
} from './drawing.js';
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
    pointToMarkup,
    saveCloneObj,
    setArcCmdConfig,
    setTransformsFieldset,
    setOutputConfiguration,
    stringifyTransforms
} from './helper-functions.js';
import {
    canvas,
    downloadLink,
    dummyImg,
    svgTemplates
} from './dom-created-elements.js';
import {
    drawingContent,
    layers,
    layerSelectors,
    pathClosingToggle,
    svg,
    transformTargetSwitch
} from './dom-shared-elements.js';
import layerTypes from './layer-types.js';
import { mkControlPoint, remControlPoints, remLastControlPoint } from './control-point-handling.js';
import { arc } from './path-commands.js';

const ctx = canvas.getContext('2d');
const download = (url) => {
    Object.assign(downloadLink, {
        download: `My_SVG.${drawing.outputConfig['file-format']}`,
        href: url
    });
    downloadLink.click();
};
const writeToClipboard = text => window.navigator.clipboard.writeText(text);

export {
    addLayer,
    addPoint,
    centerRotation,
    clearDrawing,
    configArcCmd,
    configOutput,
    dataURIToClipboard,
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
    setTransform,
    setTransformTarget,
    togglePathClosing,
    triggerDownload
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

function centerRotation() {
    const args = session.transformLayerNotDrawing
        ? [layers[session.layer], session.current.transforms]
        : [svg.firstElementChild, drawing.transforms];

    setCenterOfRotation(...args);
    applyTransforms(drawing, session);
    save();
}

function clearDrawing() {
    window.localStorage.removeItem('drawing');
    drawing.layers.length = 0;
    drawing.outputConfig = Object.assign({}, defaults.outputConfig);
    drawing.transforms = saveCloneObj(defaults.transforms);
    [...layers].forEach(layer => layer.remove());
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

function configOutput({ target }) {
    drawing.outputConfig[target.name] = target.value;
    save();
    updateViewBox();
}

function dataURIToClipboard() { writeToClipboard(generateDataURI()); }

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

function initializeDrawing() {
    // if there's a saved drawing, use it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing')) || {};
    Object.assign(drawing, {
        outputConfig: src.outputConfig || Object.assign({}, defaults.outputConfig),
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
    drawingContent.append(...drawing.layers.map((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const geometryProps = (layer.mode === 'path')
            ? { d: layer.points.map(pointToMarkup).join(' ') + (layer.closePath ? 'Z' : '') }
            : layer.points[0] || {};
        const attrs = {
            'data-layer-id': i,
            ...layer.style,
            ...geometryProps,
            transform: stringifyTransforms(layer.transforms)
        };

        return configClone(shape)(attrs);
    }));

    applyTransforms(drawing, session);
    setTransformsFieldset(drawing.transforms || defaults.transforms);
    transformTargetSwitch.checked = false;
    setArcCmdConfig(session, defaults);
    setOutputConfiguration(drawing);
}

function markupToClipboard() { writeToClipboard(generateMarkUp()); }

function pressKey(event) {
    if (window.location.hash !== '#drawing') return;

    const { key } = event;
    const move = moves[key];

    // exit label editing by pressing enter
    if (key === 'Enter' && event.target.contentEditable) event.target.blur();

    // prevent interference w eg custom labeling
    if (document.activeElement !== document.body) return;

    if (move) {
        if (!session.current && !event.ctrlKey) return;

        const { transforms: { translate: transformTarget } } = event.ctrlKey
            ? drawing
            : session.current;
        const { cb, prop } = move;

        transformTarget[prop] = cb(transformTarget[prop]);
        applyTransforms(drawing, session);
    } else if (key === 'Backspace') {
        deleteLastPoint();
    } else if (cmdTags.includes(key.toUpperCase())) {
        session.cmd = key.toUpperCase();
    }

    event.preventDefault();
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

function setCmd({ target }) { session.cmd = cmdTags[cmdTags.indexOf(target.value)] || cmdTags[0]; }

function setFillOrStroke({ target }) {
    if (!drawing.layers[session.layer]) return;

    drawing.layers[session.layer].style[target.name] = target.value;
    styleLayer(session.layer);
}

function setLayer({ target }) {
    const layerId = +target.value;
    session.mode = drawing.layers[layerId].mode;
    session.layer = layerId;
}

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
        // remove non-default style-props of old layer
        Object.keys(session.current.style).forEach((key) => {
            if (defaults.style[key] === undefined) delete session.current.style[key];
        });
        // add non-default style-props to new layer
        Object.assign(session.current.style, getNonDefaultStyles(session.mode));
    }
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

function togglePathClosing() {
    if (!drawing.layers[session.layer]) return;

    drawing.layers[session.layer].closePath = pathClosingToggle.checked;
    drawLayer(session.layer);
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