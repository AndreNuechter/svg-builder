/* globals window, document, MutationObserver */

import session from './session.js';
import {
    drawing,
    generateMarkUp,
    updateViewBox,
    setOutputConfiguration,
    save
} from './drawing.js';
import { defaults, moves } from './constants.js';
import { remLastControlPoint, remControlPoints, mkControlPoint } from './control-point-handling.js';
import {
    arc,
    getLastArcCmd,
    pathCmds,
    setArcCmdConfig
} from './path-commands.js';
import {
    drawLayer,
    Layer,
    observeLayers,
    reorderLayerSelectors,
    styleLayer
} from './layer-handling.js';
import {
    arcCmdConfig,
    drawingContent,
    layers,
    layerSelect,
    layerSelectors,
    outputConfig,
    preview,
    svg,
    transformFields,
    transformTargetSwitch,
    fillAndStroke
} from './dom-shared-elements.js';
import { svgTemplates } from './dom-created-elements.js';
import {
    configClone,
    getSVGCoords,
    parseLayerStyle,
    pointToMarkup,
    saveCloneObj,
    stringifyTransforms
} from './helper-functions.js';
import { applyTransforms, setTransformsFieldset } from './transforms.js';
import layerTypes from './layer-types.js';
import { getNonDefaultStyles } from './fill-and-stroke-syncer.js';

const addLayerBtn = document.getElementById('add-layer');
const cmds = Object.keys(pathCmds);
const undoBtn = document.getElementById('undo');

// watches for additions and removals of layers and does some synchronisation
new MutationObserver(observeLayers(session, remControlPoints, mkControlPoint))
    .observe(drawingContent, { childList: true });

window.addEventListener('DOMContentLoaded', () => {
    // if there's a saved drawing, use it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing')) || {};
    Object.assign(drawing, {
        dims: src.dims || Object.assign({}, defaults.dims),
        transforms: src.transforms || saveCloneObj(defaults.transforms),
        layers: src.layers || []
    });

    // initialize session.mode to that of the first layer or the default
    session.mode = (drawing.layers[0] && drawing.layers[0].mode)
        ? drawing.layers[0].mode
        : 'path';

    // initialize session.layer or reset arc-cmd-config
    if (drawing.layers.length) session.layer = 0;
    else setArcCmdConfig(session, defaults);

    // set selected cmd
    document.querySelector('option[value="M"]').selected = true;

    // create layer representations and config ea
    drawing.layers.forEach((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const attrs = Object.assign({ 'data-layer-id': i }, layer.mode === 'path'
            ? { d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? 'Z' : '') }
            : layer.points[0]
            || {}, parseLayerStyle(layer.style), { transform: stringifyTransforms(layer.transforms) });

        drawingContent.append(configClone(shape)(attrs));
    });

    applyTransforms(session);
    setTransformsFieldset(drawing.transforms || defaults.transforms);

    // we want to transform the entire drawing by default
    transformTargetSwitch.checked = false;

    setOutputConfiguration();
});

window.onkeydown = (e) => {
    if (window.location.hash !== '#drawing') return;

    const { key } = e;

    if (moves[key]) {
        e.preventDefault();

        if (!e.ctrlKey && !session.current) return;

        const { transforms: { translate: transformTarget } } = e.ctrlKey
            ? drawing
            : session.current;
        const { cb, prop } = moves[key];

        transformTarget[prop] = cb(transformTarget[prop]);
        applyTransforms(session);
    }

    // prevent interference w eg custom labeling
    if (document.activeElement !== document.body) return;

    if (key === 'Backspace') {
        e.preventDefault();
        undoBtn.click();
    } else if (!e.ctrlKey && cmds.includes(key.toUpperCase())) {
        e.preventDefault();
        session.cmd = key.toUpperCase();
    }
};

window.onsubmit = e => e.preventDefault();

layerSelect.onchange = ({ target }) => {
    const layerId = +target.value;
    session.mode = drawing.layers[layerId].mode;
    session.layer = layerId;
};

// re-ordering of layers via dragging of selector
layerSelect.ondragover = e => e.preventDefault();
layerSelect.ondrop = (e) => {
    const droppedOnSelector = e.target.closest('label');
    const droppedOnId = +droppedOnSelector.dataset.layerId;
    const droppedOnLayer = layers[droppedOnId];
    const draggedId = +e.dataTransfer.getData('text');
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
    e.preventDefault();
};

addLayerBtn.onclick = () => {
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
};

document.getElementById('del-layer').onclick = () => {
    if (!layers.length) return;
    drawing.layers.splice(session.layer, 1);
    save();
    layers[session.layer].remove();
};

document.getElementById('clear-all').onclick = () => {
    window.localStorage.removeItem('drawing');
    drawing.layers.length = 0;
    drawing.dims = Object.assign({}, defaults.dims);
    drawing.transforms = saveCloneObj(defaults.transforms);
    [...layers].forEach(layer => layer.remove());
};

undoBtn.onclick = () => {
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
};

// adds a point
svg.addEventListener('pointerdown', (e) => {
    if (!layers.length) addLayerBtn.click();

    const [x, y] = getSVGCoords(e);
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
}, false);

document.getElementById('commands').onchange = ({ target }) => {
    session.cmd = cmds[cmds.indexOf(target.value)] || cmds[0];
};

arcCmdConfig.oninput = ({ target }) => {
    const prop = (target.type === 'checkbox') ? 'checked' : 'value';
    session.arcCmdConfig[target.name] = target[prop];

    if (!session.current) return;

    const lastArcCmd = getLastArcCmd(session.current.points) || {};
    const updateData = Object.assign({}, defaults.arcCmdConfig, session.arcCmdConfig);

    Object.assign(lastArcCmd, arc(updateData));
    drawLayer(session.layer);
};

document.getElementById('modes').onchange = ({ target }) => {
    if (session.drawingShape) {
        session.mode = session.mode;
        return;
    }

    session.mode = target.value;

    if (!layers[session.layer]) return;

    // NOTE: if we change the mode on an existing layer, we add a new layer,
    // but if it has not been edited yet, we replace the shape and the mode
    if (session.current.points.length) {
        addLayerBtn.click();
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
};

fillAndStroke.oninput = ({ target }) => {
    if (!drawing.layers[session.layer]) return;

    drawing.layers[session.layer]
        .style[target.name] = target[target.type === 'checkbox'
            ? 'checked'
            : 'value'];

    if (!drawing.layers[session.layer]) return;

    if (target.name === 'close') drawLayer(session.layer);
    else styleLayer(session.layer);
};

transformTargetSwitch.onchange = ({ target }) => {
    if (target.checked) {
        setTransformsFieldset(session.current
            ? session.current.transforms
            : defaults.transforms);
    } else {
        setTransformsFieldset(drawing.transforms);
    }

    session.transformLayerNotDrawing = target.checked;
};

transformFields.oninput = ({ target }) => {
    const transformTarget = session.transformLayerNotDrawing
        ? session.current
        : drawing;

    // NOTE: 'rotate' has three params (deg, cx, cy)
    if (target.classList.contains('rotate-config')) {
        transformTarget.transforms.rotate[+target.dataset.id] = target.value;
    } else {
        transformTarget.transforms[target.name] = target.value;
    }

    save();
    applyTransforms(session);
};

document.getElementById('reset-transforms').onclick = () => {
    const { transforms } = defaults;

    if (transformTargetSwitch.checked) {
        if (session.current) session.current.transforms = saveCloneObj(transforms);
    } else {
        drawing.transforms = saveCloneObj(transforms);
    }

    save();
    applyTransforms(session);
    setTransformsFieldset(transforms);
};

document.querySelector('a[data-tab-name="output"]')
    .onclick = () => { preview.innerHTML = generateMarkUp(); };

outputConfig.oninput = ({ target }) => {
    drawing.dims[target.name] = target.value || drawing.dims[target.name];
    save();
    updateViewBox();
};

document.getElementById('get-markup')
    .onclick = () => window.navigator.clipboard.writeText(generateMarkUp());