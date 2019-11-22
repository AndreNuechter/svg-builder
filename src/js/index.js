/* globals window, document, MutationObserver */

import {
    proxiedSessionKeys,
    defaults,
    controlPointTypes,
    moves,
    geometryProps
} from './constants.js';
import {
    quad,
    cube,
    arc,
    pathCmds
} from './commands.js';
import { layerSelectorTemplate, circleTemplate, svgTemplates } from './dom-elements.js';
import {
    configElement,
    configClone,
    parseLayerStyle,
    getSVGCoords,
    pointToMarkup,
    stringifyTransforms,
    getIdOfControlPoint
} from './helper-functions.js';
import setFillAndStrokeFields from './components/fill-and-stroke-syncer.js';

const vacancyMsgStyle = document.getElementById('no-layer-msg').style;
const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer-selector');
const addLayerBtn = document.getElementById('add-layer');
const undoBtn = document.getElementById('undo');
const ratio = document.getElementById('ratio');
const sliceOrMeet = document.getElementById('slice-or-meet');
const commands = document.getElementById('commands');
const arcCmdConfig = document.getElementById('arc-cmd-config');
const svg = document.getElementById('canvas');
const drawingContent = svg.getElementById('drawing-content');
const layers = drawingContent.children;
const controlPointContainer = svg.getElementById('control-point-container');
const controlPoints = svg.getElementsByClassName('control-point');
const [transformTargeSwitch] = document.getElementsByName('transform-layer-only');
const transforms = document.getElementById('transformations');
const cmds = Object.keys(pathCmds);

const drawing = {};
const proxiedKeys = proxiedSessionKeys(
    drawing,
    remControlPoints,
    mkControlPoint,
    applyTransforms,
    setArcCmdConfig,
    setFillAndStrokeFields,
    setTransformsFieldset
);
const sessionKeys = Object.keys(proxiedKeys);
const session = new Proxy(Object.assign({
    get current() {
        return drawing.layers[session.layer];
    }
}, defaults.session), {
    set(obj, key, val) {
        if (!sessionKeys.includes(key) || !proxiedKeys[key].check(val)) return false;
        obj[key] = val;
        proxiedKeys[key].onPass(val);
        return true;
    }
});

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
new MutationObserver((mutationsList) => {
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
                setFillAndStrokeFields(defaults.style);
                return;
            }

            if (session.layer === layers.length) {
                session.layer -= 1;
            } else {
                session.mode = session.current.mode;
                remControlPoints();
                session.current.points.forEach(mkControlPoint);
                setFillAndStrokeFields(session.current.style);
                reorderLayerSelectors(id, layerSelect.childElementCount - 1);
            }

            // check the active layer's selector
            layerSelectors[session.layer].checked = true;
        }
    });
}).observe(drawingContent, { childList: true });

window.addEventListener('DOMContentLoaded', () => {
    // give canvas the entire space available
    configElement(svg, {
        height: Math.trunc(window.innerHeight - svg.getBoundingClientRect().top)
    });

    // if there's a saved drawing, use it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing')) || {};
    Object.assign(drawing, {
        dims: src.dims || JSON.parse(JSON.stringify(defaults.dims)),
        layers: src.layers || []
    });

    // initialize session.mode to that of the first layer or the default
    session.mode = (drawing.layers[0] && drawing.layers[0].mode)
        ? drawing.layers[0].mode
        : 'path';

    // initialize session.layer or reset arc-cmd-config
    if (drawing.layers.length) session.layer = 0;
    else setArcCmdConfig();

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

    applyTransforms();
    setTransformsFieldset(drawing.dims.transforms || defaults.dims.transforms);

    // we want to transform the entire drawing by default
    transformTargeSwitch.checked = false;

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
        applyTransforms();
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

    // insert dragged before or after the one dropped on depending on its origin
    if (draggedId < droppedOnId) {
        droppedOnLayer.after(draggedLayer);
    } else {
        drawingContent.insertBefore(draggedLayer, droppedOnLayer);
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
            transforms: JSON.parse(JSON.stringify(defaults.dims.transforms))
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
        drawLayer();
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

    const [x, y] = getSVGCoords(e, svg);
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
        mkControlPoint(points[points.length - 1], points.length - 1);
        session.drawingShape = false;
        svg.onmousemove = null;
    } else {
        // TODO: move this out
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
                mkControlPoint(points[points.length - 1], points.length - 1);
            }
        };

        modes[session.mode]();
    }

    styleLayer();
    drawLayer();
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

document.getElementById('fill-and-stroke').oninput = ({ target }) => {
    // NOTE: this could happen before the layer exists or has styles and
    // we still want to capture the input
    const storageLocation = drawing.layers[session.layer]
        ? drawing.layers[session.layer].style
        : session.currentStyle;

    storageLocation[target.name] = target[target.type === 'checkbox' ? 'checked' : 'value'];

    if (!drawing.layers[session.layer]) return;

    if (target.id === 'close-toggle') drawLayer();
    else styleLayer();
};

arcCmdConfig.oninput = ({ target }) => {
    const prop = (target.type === 'checkbox') ? 'checked' : 'value';
    session.arcCmdConfig[target.name] = target[prop];

    if (!session.current) return;

    const lastArcCmd = getLastArcCmd(session.current.points) || {};
    const updateData = Object.assign({}, defaults.arcCmdConfig, session.arcCmdConfig);

    Object.assign(lastArcCmd, arc(updateData));
    drawLayer();
};

function setArcCmdConfig() {
    const conf = session.current
        ? (getLastArcCmd(session.current.points)
            || Object.assign({}, defaults.arcCmdConfig, session.arcCmdConfig))
        : defaults.arcCmdConfig;

    Object.assign(session.arcCmdConfig, conf);
    Object.entries(conf)
        .filter(([key]) => !['cmd', 'x', 'y'].includes(key)) // NOTE: the data might be coming from a point
        .forEach(([key, val]) => {
            const field = arcCmdConfig.elements[key];
            field[(field.type === 'checkbox') ? 'checked' : 'value'] = val;
        });
}

function getLastArcCmd(points) {
    return points
        .slice()
        .reverse()
        .find(point => point.cmd === 'A');
}

transformTargeSwitch.onchange = ({ target }) => {
    if (target.checked) {
        setTransformsFieldset(session.current ? session.current.transforms : defaults.dims.transforms);
    } else {
        setTransformsFieldset(drawing.dims.transforms);
    }

    session.transformLayerNotDrawing = target.checked;
};

function setTransformsFieldset(conf = defaults.dims.transforms) {
    Object.entries(conf)
        .filter(([key]) => key !== 'translate') // NOTE: we manage translations via arrow-keys
        .forEach(([key, val]) => {
            const value = (key === 'rotate') ? val.slice(0, val.indexOf(',')) : val; // NOTE: rotate gets 3 params
            transforms.elements[key].value = value;
        });
}

transforms.oninput = ({ target }) => {
    const transformTarget = session.transformLayerNotDrawing
        ? session.current
        : drawing.dims;

    // NOTE otherwise getBBox might be called with undefined
    if (transformTarget === session.current && !layers.length) return;

    let value;
    // NOTE: 'rotate' can take three params (deg, cx, cy)
    // we want to rotate from the center
    if (target.name === 'rotate') {
        const {
            x,
            y,
            width,
            height
        } = (transformTarget === session.current ? layers[session.layer] : drawingContent).getBBox();
        const centerOfTransformTarget = [x + (width * 0.5), y + (height * 0.5)];
        value = [target.value, ...centerOfTransformTarget].join(',');
    } else {
        ({ value } = target);
    }

    transformTarget.transforms[target.name] = value;
    save();
    applyTransforms();
};

document.getElementById('preview')
    .onclick = () => window.open('').document.write(generateMarkUp());

document.getElementById('get-markup')
    .onclick = () => window.navigator.clipboard.writeText(generateMarkUp());

/**
 * Adjusts layer-ids and labels of layers and selectors affected by re-ordering or deleting.
 * @param { number } startIndex The ordinal of the first affected item.
 * @param { number } endIndex The ordinal of the last affected item.
 */
function reorderLayerSelectors(startIndex, endIndex) {
    for (let i = startIndex; i <= endIndex; i += 1) {
        const selector = layerSelect.children[i];
        selector.dataset.layerId = i;
        layers[i].dataset.layerId = i;
        selector.children[0].textContent = drawing.layers[i].label || `Layer ${i + 1}`;
        selector.children[1].value = i;
    }
}

/**
 * Returns an eventHandler for drawing a shape (ellipse or rect).
 * @param { SVGEllipseElement | SVGRectElement } shape The shape being drawn.
 * @param { Function } attrs A lambda evaluating to the respective attributes when given the current mouse-position.
 * @returns { Function }
 */
function drawShape(shape, attrs) {
    return (e) => {
        const [x1, y1] = getSVGCoords(e, svg);
        configElement(shape, attrs(x1, y1));
    };
}

/**
 * Changes the style-related attributes of a layer.
 * @param { number } [layerId=session.layer] The ordinal number of the affected layer. Defaults to the active layer.
 * @param { Object } [conf=drawing.layers[layerId].style] The container of style-related attributes of the affected layer.
 */
function styleLayer(layerId = session.layer, conf = drawing.layers[layerId].style) {
    configElement(layers[layerId], parseLayerStyle(conf));
    save();
}

/**
 * Syncs geometry attributes of a layers representation w the data.
 * @param { number } [layerId=session.layer] The ordinal number of the affected layer. Defaults to the current.
 * @param { SVGPathElement | SVGRectElement | SVGEllipseElement } [layerId=session.layer] The affected SVG-element.
 * @param { Object } [layerData=drawing.layers[layerId]] The affected layer. Defaults to the current.
 */
function drawLayer(layerId = session.layer, layer = layers[layerId], layerData = drawing.layers[layerId]) {
    configElement(layer, geometryProps[layerData.mode](layerData));
    save();
}

/**
 * Applies transforms to the layer-container,
 * the currently active layer and its control points.
 */
function applyTransforms() {
    const drawingTransforms = stringifyTransforms(drawing.dims.transforms);
    const applicants = [drawingContent, controlPointContainer];
    const transformations = [drawingTransforms];

    if (layers[session.layer]) {
        const layerTransforms = stringifyTransforms(session.current.transforms);
        applicants.push(layers[session.layer]);
        transformations.push(drawingTransforms + layerTransforms, layerTransforms);
    } else {
        transformations.push(drawingTransforms);
    }

    applicants.forEach((a, i) => a.setAttribute('transform', transformations[i]));
}

/**
 * Removes the control point(s) of the last point added to a path-layer.
 * @param { string } cmd The command of the removed point.
 */
function remLastControlPoint(cmd) {
    controlPoints[controlPoints.length - 1].remove();
    if (cmd === 'Q' || cmd === 'C') controlPoints[controlPoints.length - 1].remove();
    if (cmd === 'C') controlPoints[controlPoints.length - 1].remove();
}

/**
 * Removes all control points of the active layer.
 */
function remControlPoints() {
    [...controlPoints].forEach(c => c.remove());
}

/**
 * The interface for control point creation.
 * @param { Object } point The data of the point that should be controlled.
 * @param { number } pointId The ordinal number of the point within its layer.
 */
function mkControlPoint(point, pointId) {
    const cps = [];

    if (point.cmd) {
        if (['M', 'L', 'Q', 'C', 'A'].includes(point.cmd)) {
            cps.push(ControlPoint(point.x, point.y, pointId, 'regularPoint'));
        } else if (point.cmd === 'H') {
            cps.push(ControlPoint(point.x, session.current.points[pointId - 1].y, pointId, 'hCmd'));
        } else if (point.cmd === 'V') {
            cps.push(ControlPoint(session.current.points[pointId - 1].x, point.y, pointId, 'vCmd'));
        }

        if (point.cmd === 'Q' || point.cmd === 'C') {
            cps.push(ControlPoint(point.x1, point.y1, pointId, 'firstControlPoint'));
        }

        if (point.cmd === 'C') {
            cps.push(ControlPoint(point.x2, point.y2, pointId, 'secondControlPoint'));
        }
        // eslint-disable-next-line no-prototype-builtins
    } else if (point.hasOwnProperty('width')) {
        cps.push(ControlPoint(point.x, point.y, pointId, 'regularPoint'),
            ControlPoint(point.x + point.width, point.y + point.height, pointId, 'rectLowerRight'));
        // eslint-disable-next-line no-prototype-builtins
    } else if (point.hasOwnProperty('cx')) {
        cps.push(ControlPoint(point.cx, point.cy, pointId, 'ellipseCenter'),
            ControlPoint(point.cx - point.rx, point.cy, pointId, 'ellipseRx'),
            ControlPoint(point.cx, point.cy - point.ry, pointId, 'ellipseRy'));
    }

    // NOTE: we dont add the cps to the drawingContent to keep em out of the markup
    controlPointContainer.append(...cps);
}

/**
 * Constructs a single draggable point to control some prop(s) of the active layer.
 * @param { number } x The x-ccordinate of the cp.
 * @param { number } y The y-ccordinate of the cp.
 * @param { number } pointId The ordinal number of the point within its layer.
 * @param { string } [controlPointType] the type of cp we want to create.
 */
function ControlPoint(x, y, pointId, controlPointType) {
    const layer = session.current;

    const cp = configClone(circleTemplate)({
        cx: x,
        cy: y
    });

    cp.onmousedown = (e) => {
        // prevent triggering svg.onmousedown
        e.stopPropagation();
        svg.onmousemove = dragging(layer, pointId, controlPointType, cp);
        svg.onmouseleave = stopDragging;
        svg.onmouseup = stopDragging;
    };

    cp.onmouseup = stopDragging;

    return cp;
}

/**
 * The eventHandler-factory for a draggable cp.
 * @param { Object } layer The layer the dragged cp affects.
 * @param { number } pointId The ordinal number of the point within layer the dragged cp belongs to.
 * @param { string } controlPointType The "type" of cp we're dealing with.
 * @param { SVGCircleElement } controlPoint The cp that's to be dragged.
 * @returns { Function } The event-handler to be executed when dragging the cp.
 */
// TODO store the effects applied to the cps in controlPointTypes
function dragging(layer, pointId, controlPointType, controlPoint) {
    const args = controlPointTypes[controlPointType];
    const argsKeys = Object.keys(args);
    const point = layer.points[pointId];
    const affectedControlPoints = [{ ref: controlPoint, fx: [] }];

    if (!['rectLowerRight', 'ellipseRy', 'vCmd'].includes(controlPointType)) {
        affectedControlPoints[0].fx.push(({ x }) => ({ cx: x }));
    }

    if (!['rectLowerRight', 'ellipseRx', 'hCmd'].includes(controlPointType)) {
        affectedControlPoints[0].fx.push(({ y }) => ({ cy: y }));
    }

    // we don't want the lower right edge of a rect to move above or left of its anchor
    if (controlPointType === 'rectLowerRight') {
        affectedControlPoints[0].fx.push(
            ({ y }) => {
                if (y < point.y) return { cy: point.y };
                return { cy: y };
            },
            ({ x }) => {
                if (x < point.x) return { cx: point.x };
                return { cx: x };
            }
        );
    }

    // move cps of affected V and H cmds
    if (point.cmd && layer.points[pointId + 1]) {
        if (layer.points[pointId + 1].cmd === 'V') {
            affectedControlPoints.push({
                ref: controlPoints[getIdOfControlPoint(layer, pointId + 1)],
                fx: [
                    ({ x }) => ({ cx: x })
                ]
            });
        } else if (layer.points[pointId + 1].cmd === 'H') {
            affectedControlPoints.push({
                ref: controlPoints[getIdOfControlPoint(layer, pointId + 1)],
                fx: [
                    ({ y }) => ({ cy: y })
                ]
            });
        }
    }

    // if the dragged cp is the anchor of a rect or the center of an ellipse,
    // we want to move the related cp(s) too
    // eslint-disable-next-line no-prototype-builtins
    if (point.hasOwnProperty('width') && args.x) {
        affectedControlPoints.push({
            ref: controlPoints[1],
            fx: [
                ({ x }) => ({ cx: x + point.width }),
                ({ y }) => ({ cy: y + point.height })
            ]
        });
    } else if (args.cx) {
        affectedControlPoints.push({
            ref: controlPoints[1],
            fx: [
                () => ({ cx: point.cx - point.rx }),
                () => ({ cy: point.cy })
            ]
        }, {
            ref: controlPoints[2],
            fx: [
                () => ({ cx: point.cx }),
                () => ({ cy: point.cy - point.ry })
            ]
        });
    }

    return (e) => {
        const [x, y] = getSVGCoords(e, svg);

        // update the dragged points data
        argsKeys.forEach(key => Object.assign(point, {
            [key]: args[key]({ x, y }, point)
        }));

        // update the affected layer's visual representation
        drawLayer();

        // move the affected cp(s)
        affectedControlPoints.forEach(({ ref, fx }) => {
            configElement(ref, fx
                .reduce((keyValPairs, keyVal) => Object
                    .assign(keyValPairs, keyVal({ x, y })), {}));
        });
    };
}

/**
 * Removes dragging-related eventlisteners from svg.
 */
function stopDragging() {
    svg.onmousemove = null;
    svg.onmouseleave = null;
    svg.onmouseup = null;
}

/**
 * Returns the markup of the created drawing (the content of group) inside default svg markup.
 */
function generateMarkUp() {
    const {
        x,
        y,
        width,
        height
    } = drawingContent.getBBox();
    const drawingTransforms = stringifyTransforms(drawing.dims.transforms);

    return `
    <svg 
    xmlns="http://www.w3.org/2000/svg"
    width="${drawing.dims.width}" 
    height="${drawing.dims.height}" 
    viewBox="${[x, y, width, height].join(' ')}" 
    preserveAspectRatio="${[ratio.value, sliceOrMeet.value].join(' ')}">
    <g transform="${drawingTransforms}">
        ${drawingContent.innerHTML}
    </g>
    </svg>`
        .replace(/ data-layer-id="\d+?"/g, '')
        .replace(/\s{2,}/g, ' ');
}

/**
 * Saves the drawing-data to localStorage.
 */
function save() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}