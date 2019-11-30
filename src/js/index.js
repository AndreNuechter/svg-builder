/* globals window, document, MutationObserver */

import session from './session.js';
import { drawing, generateMarkUp, save } from './drawing.js';
import { defaults, moves } from './constants.js';
import { remLastControlPoint, remControlPoints, mkControlPoint } from './control-point-handling.js';
import {
    quad,
    setArcCmdConfig,
    getLastArcCmd,
    cube,
    arc,
    pathCmds
} from './commands.js';
import { drawLayer, styleLayer, reorderLayerSelectors } from './layer-handling.js';
import {
    arcCmdConfig,
    drawingContent,
    layers,
    layerSelect,
    svg,
    transformFields,
    transformTargetSwitch,
    fillAndStroke
} from './dom-shared-elements.js';
import { layerSelectorTemplate, svgTemplates } from './dom-created-elements.js';
import {
    configElement,
    configClone,
    drawShape,
    parseLayerStyle,
    getSVGCoords,
    pointToMarkup,
    saveCloneObj,
    stringifyTransforms
} from './helper-functions.js';
import { applyTransforms, setTransformsFieldset } from './transforms.js';
import setFillAndStrokeFields from './components/fill-and-stroke-syncer.js';

const vacancyMsgStyle = document.getElementById('no-layer-msg').style;
const layerSelectors = document.getElementsByName('layer-selector');
const addLayerBtn = document.getElementById('add-layer');
const undoBtn = document.getElementById('undo');
const commands = document.getElementById('commands');
const cmds = Object.keys(pathCmds);
const dragLayerSelector = (e) => {
    e.dataTransfer.setData('text', e.target.dataset.layerId);
    e.dataTransfer.effectAllowed = 'move';
};
const changeLayerLabel = ({ target }) => {
    // NOTE: we assume edition is preceded by selection and the edited label belongs to the active layer
    session.current.label = target.textContent.replace(/\n/g, /\s/).trim();
    save();
};

// watches for additions and removals of layers and does some synchronisation
new MutationObserver((mutationsList) => { // TODO: own module, layer-handling?!
    // hide/show a message when no layers exist
    vacancyMsgStyle.display = drawingContent.childElementCount ? 'none' : 'initial';

    // prevent interfering w reordering
    if (session.reordering) {
        session.reordering = false;
        return;
    }

    mutationsList.forEach((mutation) => {
        // deal w addition of layer (add a corresponding selector)
        if (mutation.addedNodes.length) {
            const layerId = layerSelect.childElementCount;
            const layerSelector = layerSelectorTemplate.cloneNode(true);
            const [label, selector] = layerSelector.children;
            layerSelector.dataset.layerId = layerId;
            configElement(label, {
                textContent: drawing.layers[layerId]
                    ? drawing.layers[layerId].label || `Layer ${layerId + 1}`
                    : `Layer ${layerId + 1}`
            });
            configElement(selector, {
                value: layerId,
                checked: session.layer === layerSelectors.length
            });
            layerSelector.ondragstart = dragLayerSelector;
            label.oninput = changeLayerLabel;
            layerSelect.append(layerSelector);
        }

        // deal w removal of layer(s)
        if (mutation.removedNodes.length) {
            // delete selector
            const id = +mutation
                .removedNodes[0]
                .dataset
                .layerId;
            layerSelect
                .lastChild
                .remove();

            // if there're no layers left, we do some clean-up and are done
            if (!layers.length) {
                delete session.layer;
                remControlPoints();
                setTransformsFieldset(defaults.dims.transforms);
                applyTransforms(session);
                setFillAndStrokeFields(defaults.style);
                return;
            }

            if (session.layer === layers.length) {
                session.layer -= 1;
            } else {
                session.mode = session.current.mode;
                remControlPoints();
                session.current.points.forEach(mkControlPoint(session.layer));
                setFillAndStrokeFields(session.current.style);
                reorderLayerSelectors(id, layerSelect.childElementCount - 1);
            }

            // check the active layer's selector
            layerSelectors[session.layer].checked = true;
        }
    });
}).observe(drawingContent, { childList: true });

window.addEventListener('DOMContentLoaded', () => {
    // if there's a saved drawing, use it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing')) || {};
    Object.assign(drawing, {
        dims: src.dims || saveCloneObj(defaults.dims),
        layers: src.layers || []
    });

    // initialize session.mode to that of the first layer or the default
    session.mode = (drawing.layers[0] && drawing.layers[0].mode)
        ? drawing.layers[0].mode
        : 'path';

    // initialize session.layer or reset arc-cmd-config
    if (drawing.layers.length) session.layer = 0;
    else setArcCmdConfig(session, defaults);

    // create layer representations incl selectors and config ea
    drawing.layers.forEach((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const attrs = Object
            .assign({ 'data-layer-id': i },
                layer.mode === 'path' ? {
                    d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '')
                } : layer.points[0] || {},
                parseLayerStyle(layer.style), { transform: stringifyTransforms(layer.transforms) });

        drawingContent.append(configClone(shape)(attrs));
    });

    applyTransforms(session);
    setTransformsFieldset(drawing.dims.transforms || defaults.dims.transforms);

    // we want to transform the entire drawing by default
    transformTargetSwitch.checked = false;

    // adjust inputs for changing the dimensions of the drawing
    document.getElementById('width').value = drawing.dims.width;
    document.getElementById('height').value = drawing.dims.height;
});

window.onkeydown = (e) => {
    const { key } = e;

    if (moves[key]) {
        e.preventDefault();

        const { transforms: { translate: transformTarget } } = e.ctrlKey
            ? drawing.dims
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

arcCmdConfig.oninput = ({ target }) => {
    const prop = (target.type === 'checkbox') ? 'checked' : 'value';
    session.arcCmdConfig[target.name] = target[prop];

    if (!session.current) return;

    const lastArcCmd = getLastArcCmd(session.current.points) || {};
    const updateData = Object.assign({}, defaults.arcCmdConfig, session.arcCmdConfig);

    Object.assign(lastArcCmd, arc(updateData));
    drawLayer(session.layer);
};

document.getElementById('reset-transforms').onclick = () => {
    const { transforms } = defaults.dims;

    if (transformTargetSwitch.checked) {
        if (session.current) session.current.transforms = saveCloneObj(transforms);
    } else {
        drawing.dims.transforms = saveCloneObj(transforms);
    }

    save();
    applyTransforms(session);
    setTransformsFieldset(transforms);
};

transformTargetSwitch.onchange = ({ target }) => {
    if (target.checked) {
        setTransformsFieldset(session.current
            ? session.current.transforms
            : defaults.dims.transforms);
    } else {
        setTransformsFieldset(drawing.dims.transforms);
    }

    session.transformLayerNotDrawing = target.checked;
};

transformFields.oninput = ({ target }) => {
    const transformTarget = session.transformLayerNotDrawing
        ? session.current
        : drawing.dims;

    // NOTE otherwise getBBox() might be called with undefined
    if (transformTarget === session.current && !layers.length) return;

    let value;
    // NOTE: 'rotate' can take three params (deg, cx, cy) and
    // we want to rotate from the center
    if (target.name === 'rotate') {
        const {
            x,
            y,
            width,
            height
        } = (transformTarget === session.current
            ? layers[session.layer]
            : drawingContent).getBBox();
        const centerOfTransformTarget = [x + (width * 0.5), y + (height * 0.5)];
        value = [target.value, ...centerOfTransformTarget].join(',');
    } else {
        ({ value } = target);
    }

    transformTarget.transforms[target.name] = value;
    save();
    applyTransforms(session);
};

// Layers
layerSelect.onchange = ({ target }) => {
    const layerId = +target.value;
    // NOTE: the order is important here,
    // cuz control point creation (triggered by setting layer),
    // depends on the currently selected mode
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
    const currentStyles = Object.keys(session.currentStyle);
    // add new vanilla layer-data and set session-focus to it
    session.layer = drawing
        .layers
        .push({
            mode: session.mode,
            points: [],
            // NOTE: the user might have configured styles before starting to draw the layer
            style: currentStyles.length
                ? Object.assign({}, defaults.style, session.currentStyle)
                : Object.assign({}, defaults.style),
            transforms: saveCloneObj(defaults.dims.transforms)
        }) - 1;
    save();

    // reset the current styles
    currentStyles.forEach(key => delete session.currentStyle[key]);

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
    [...layers].forEach(layer => layer.remove());
};

undoBtn.onclick = () => {
    const latestPoint = session.current.points.pop();

    if (!latestPoint) return;

    if (latestPoint.cmd) {
        remLastControlPoint(latestPoint.cmd);
        drawLayer(session.layer);
    } else {
        // NOTE: to make this work properly for rects or ellipses,
        // and still have changing mode work as expected,
        // we cache the layer-id, remove all attrs and re-add the layer-id.
        remControlPoints();

        const layer = layers[session.layer];
        const { layerId } = layer.dataset;

        while (layer.attributes.length) {
            layer.removeAttribute(layer.attributes[0].name);
        }

        layer.dataset.layerId = layerId;
        save();
    }
};

// adds a point
svg.addEventListener('mousedown', (e) => {
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
        mkControlPoint(session.layer)(points[points.length - 1], points.length - 1);
        session.drawingShape = false;
        svg.onmousemove = null;
    } else {
        // TODO: move this out...c. geometryProps
        const modes = {
            rect() {
                if (points[0]) return;

                const rect = layers[session.layer];
                points[0] = { x, y };
                configElement(rect, points[0]);
                session.drawingShape = true;
                [session.shapeStart.x, session.shapeStart.y] = [x, y];

                svg.onmousemove = drawShape(rect, (x1, y1) => ({
                    x: Math.min(x, x1),
                    y: Math.min(y, y1),
                    width: Math.abs(x - x1),
                    height: Math.abs(y - y1)
                }));
            },
            ellipse() {
                if (points[0]) return;

                const ellipse = layers[session.layer];
                points[0] = { cx: x, cy: y };
                configElement(ellipse, points[0]);
                session.drawingShape = true;
                [session.shapeStart.x, session.shapeStart.y] = [x, y];

                svg.onmousemove = drawShape(ellipse, (x1, y1) => ({
                    rx: Math.abs(x - x1),
                    ry: Math.abs(y - y1)
                }));
            },
            path() {
                const lastPoint = points[points.length - 1];

                // prevent using the same point multiple times in a row
                if (lastPoint
                    && x === lastPoint.x
                    && y === lastPoint.y) return;

                // ensure first point of a path is a moveTo command
                if (!points.length) session.cmd = 'M';

                // ensure there're no multiple consecutive moveTo commands
                if (lastPoint && lastPoint.cmd === 'M' && session.cmd === 'M') {
                    points.pop();
                    remLastControlPoint(session.cmd);
                }

                if (session.cmd === 'V') points.push({ cmd: session.cmd, y });
                else if (session.cmd === 'H') points.push({ cmd: session.cmd, x });
                else points.push({ cmd: session.cmd, x, y });

                // for Q, C and A cmds we need to add cp(s)
                if (session.cmd === 'Q') {
                    const cp = quad(x, y, points[points.length - 2]);
                    Object.assign(points[points.length - 1], cp);
                } else if (session.cmd === 'C') {
                    const cps = cube(x, y, points[points.length - 2]);
                    Object.assign(points[points.length - 1], cps);
                } else if (session.cmd === 'A') {
                    const cp = arc(Object.assign({}, defaults.arcCmdConfig, session.arcCmdConfig));
                    Object.assign(points[points.length - 1], cp);
                }

                // create cp(s) for the new point
                mkControlPoint(session.layer)(points[points.length - 1], points.length - 1);
            }
        };

        modes[session.mode]();
    }

    styleLayer(session.layer);
    drawLayer(session.layer);
}, false);

commands.onchange = ({ target }) => {
    session.cmd = cmds[cmds.indexOf(target.value)] || cmds[0];
};

document.getElementById('dims').onchange = ({ target }) => {
    drawing.dims[target.id] = target.value || drawing.dims[target.id];
    save();
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
    }
};

fillAndStroke.oninput = ({ target }) => {
    // NOTE: this could happen before the layer exists or has styles and
    // we still want to capture the input
    const storageLocation = drawing.layers[session.layer]
        ? drawing.layers[session.layer].style
        : session.currentStyle;

    storageLocation[target.name] = target[target.type === 'checkbox'
        ? 'checked'
        : 'value'];

    if (!drawing.layers[session.layer]) return;

    if (target.name === 'close') drawLayer(session.layer);
    else styleLayer(session.layer);
};

document.getElementById('preview')
    .onclick = () => window.open('').document.write(generateMarkUp());

document.getElementById('get-markup')
    .onclick = () => window.navigator.clipboard.writeText(generateMarkUp());