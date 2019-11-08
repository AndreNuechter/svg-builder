/* globals window, document, MutationObserver */

import {
    proxiedSessionKeys,
    defaults,
    controlPointTypes,
    moves,
    cmds
} from './constants.js';
import {
    quad,
    cube,
    arc
} from './commands.js';
import {
    configElement,
    configClone,
    parseLayerStyle,
    getMousePos,
    pointToMarkup,
    stringifyTransforms
} from './helper-functions.js';
import setFillAndStrokeFields from './components/fill-and-stroke-syncer.js';

// Layers fieldset
const vacancyMsgStyle = document.getElementById('no-layer-msg').style;
const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer');
const addLayerBtn = document.getElementById('add-layer');
const undoBtn = document.getElementById('undo');
// Preserve aspect ratio related inputs
const ratio = document.getElementById('ratio');
const meetOrSlice = document.getElementById('slice-or-meet');
// Path commands (visible when in 'path' mode) and enum of allowed values
const commands = document.getElementById('commands');
const arcCmdConfig = document.getElementById('arc-cmd-config');
// SVG
const svg = document.getElementById('outer-container');
const drawingContent = svg.getElementById('inner-container');
const layers = drawingContent.children;
const helperContainer = svg.getElementById('svg-helpers');
const controlPoints = svg.getElementsByClassName('control-point');
let transformLayerNotDrawing; // TODO: add to session

const drawing = {};
const proxiedKeys = proxiedSessionKeys(
    drawing,
    remControlPoints,
    mkControlPoint,
    setFillAndStrokeFields
);
const sessionKeys = Object.keys(proxiedKeys);
// partially initialize session and define a trap on set
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

// TODO this is helpful, but only temporary
window.global = session;

// create and organize used HTML/SVG elements
const layerSelectorTemplate = (() => {
    const label = configElement(document.createElement('label'), { draggable: true });
    const labelTextContainer = configElement(document.createElement('span'), {
        contenteditable: true
    });
    const selector = configElement(document.createElement('input'), {
        type: 'radio',
        name: 'layer'
    });

    label.append(labelTextContainer, selector);

    return label;
})();
const ns = 'http://www.w3.org/2000/svg';
const pathTemplate = document.createElementNS(ns, 'path');
const rectTemplate = document.createElementNS(ns, 'rect');
const ellipseTemplate = document.createElementNS(ns, 'ellipse');
const circleTemplate = (() => configElement(document.createElementNS(ns, 'circle'), {
    r: 3,
    class: 'control-point'
}))();
const svgTemplates = { path: pathTemplate, rect: rectTemplate, ellipse: ellipseTemplate };

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
    // TODO: sync arcCmdConfig (return fields to defaults and if first layer is path containing arc cmd, set it to its config)...on layer switch too (if selected layer is path containing arc cmd, set it to its config)
    // TODO: transform fieldsets too. start: set fieldset to global config; switch: if we changed to transforming single layer, set fieldset to the config of the new layer

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

    // possibly initialize session.layer
    if (drawing.layers.length) session.layer = 0;

    // create layer representations incl selectors and config ea
    drawing.layers.forEach((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const attrs = Object
            .assign({ 'data-layer-id': i },
                layer.mode === 'path' ? {
                    d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '')
                } : layer.points[0] || {},
                parseLayerStyle(layer.style));

        drawingContent.append(configClone(shape)(attrs));
    });

    // adjust inputs for changing the dimensions of the drawing
    document.getElementById('width').value = drawing.dims.width;
    document.getElementById('height').value = drawing.dims.height;

    // we want to transform the entire drawing by default
    document.querySelector('[name=target-switch]').checked = false;
});

// NOTE: to not have to move control points around when moving a layer,
// they're removed and thus need to be re-added when stoping to move
window.onkeyup = (e) => {
    if (!e.ctrlKey && moves[e.key]) {
        session.current.points.forEach(mkControlPoint);
    }
};

window.onkeydown = (e) => {
    const { key } = e;

    if (moves[key]) {
        e.preventDefault();

        // translate the entire drawing when the ctrl key is pressed
        if (e.ctrlKey) {
            const { cb } = moves[key];

            drawing.dims.transforms.translate[moves[key].props[0] === 'x' ? 0 : 1] = key.match(/Arrow(?:Up|Down)/)
                ? cb(drawing.dims.transforms.translate[1])
                : cb(drawing.dims.transforms.translate[0]);

            applyTransforms();

            return;
        }

        // else move the layer
        move(key, session.current.points);
        drawLayer();
        remControlPoints();
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
    // NOTE: the order is important here, cuz control point creation (triggered by setting layer) depends on the currently selected mode
    session.mode = drawing.layers[layerId].mode;
    session.layer = layerId;
};

// re-ordering of layers via dragging of selector
layerSelect.ondragover = e => e.preventDefault();
layerSelect.ondrop = (e) => {
    e.preventDefault();

    // NOTE: the dragged layer is first removed and then re-added, triggering the observer on group...
    // BUT since the the actions there happen after the fact, proper syncing via that is a pain
    // SO we do the necessary work here

    // signify to the observer on group that we are reordering
    session.reordering = true;

    // NOTE: the node we're dropping on may not be a wrapper of a selector (a label) but a child of one (a radio)
    const droppedOnSelector = e.target.tagName === 'LABEL'
        ? e.target
        : e.target.parentNode;
    const droppedOnId = +droppedOnSelector.dataset.layerId;
    const droppedOnLayer = layers[droppedOnId];
    const draggedId = +e.dataTransfer.getData('text');
    const draggedLayer = layers[draggedId];

    // re-order the layer data
    const [draggedLayerData] = drawing.layers.splice(draggedId, 1);
    drawing.layers.splice(droppedOnId, 0, draggedLayerData);
    save();

    // TODO dragging layer other than active, feels weird, since the session is set to it
    // we want the active layer to remain active in that case
    session.layer = droppedOnId;
    layerSelectors[session.layer].checked = true;

    // insert dragged before or after the one dropped on depending on its origin
    if (draggedId < droppedOnId) {
        droppedOnLayer.after(draggedLayer);
    } else {
        drawingContent.insertBefore(draggedLayer, droppedOnLayer);
    }

    reorderLayerSelectors(Math.min(draggedId, droppedOnId), Math.max(draggedId, droppedOnId));
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

    // config the appropriate shape
    const shape = configClone(svgTemplates[session.mode])({
        'data-layer-id': session.layer
    });

    // append the shape to the drawing
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

    const [x, y] = getMousePos(svg, e);
    const { points } = session.current;

    if (session.drawingShape) {
        session.drawingShape = false;
        svg.onmousemove = null;

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
    } else if (session.mode === 'rect') {
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
    } else if (session.mode === 'ellipse') {
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
    } else if (session.mode === 'path') {
        const lastPoint = points[points.length - 1];

        // prevent using the same point multiple times in a row
        if (lastPoint
            && x === lastPoint.x
            && y === lastPoint.y) {
            return;
        }

        // ensure first point of a path is a moveTo command
        if (!points.length) {
            session.cmd = 'M';
        }

        // ensure there're no multiple consecutive moveTo commands
        if (lastPoint && lastPoint.cmd === 'M' && session.cmd === 'M') {
            points.pop();
            remLastControlPoint(session.cmd);
        }

        if (['M', 'L', 'Q', 'C', 'A'].includes(session.cmd)) points.push({ cmd: session.cmd, x, y });
        else if (session.cmd === 'H') points.push({ cmd: session.cmd, x });
        else if (session.cmd === 'V') points.push({ cmd: session.cmd, y });

        // for Q, C and A cmds we need to add cp(s)
        if (session.cmd === 'Q') {
            const cp = quad(x, y, points[points.length - 2]);
            Object.assign(points[points.length - 1], cp);
        } else if (session.cmd === 'C') {
            const cps = cube(x, y, points[points.length - 2]);
            Object.assign(points[points.length - 1], cps);
        } else if (session.cmd === 'A') {
            const cp = arc(session.arcCmdConfig);
            Object.assign(points[points.length - 1], cp);
        }

        // create cp(s) for the new point
        mkControlPoint(points[points.length - 1], points.length - 1);
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

    // NOTE: if we change the mode on an existing layer, we add a new layer
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

arcCmdConfig.oninput = ({ target }) => {
    if (!session.current) return;

    session.arcCmdConfig[target.name] = target[
        target.type === 'checkbox' ? 'checked' : 'value'
    ];

    const lastACmd = session.current.points
        .slice()
        .reverse()
        .find(point => point.cmd === 'A') || {};

    Object.assign(lastACmd, {
        xR: session.arcCmdConfig.xR,
        yR: session.arcCmdConfig.yR,
        xRot: session.arcCmdConfig.xRot,
        large: +session.arcCmdConfig.large,
        sweep: +session.arcCmdConfig.sweep
    });

    drawLayer();
};

// Fill & Stroke
document.getElementById('fill-and-stroke').oninput = ({ target }) => {
    // NOTE: this could happen before the layer exists or has styles and
    // we still want to capture the input
    const storageLocation = drawing
        .layers[session.layer] ? drawing.layers[session.layer].style : session.currentStyle;

    storageLocation[target.name] = target[target.type === 'checkbox' ? 'checked' : 'value'];

    if (!drawing.layers[session.layer]) return;

    if (target.id === 'close-toggle') {
        drawLayer();
    } else {
        styleLayer();
    }
};

document.getElementById('transformations').oninput = ({ target }) => {
    if (target.name === 'target-switch') {
        // TODO: if we switched to transforming single layer, we need to sync the transform fieldset to the current layers config
        transformLayerNotDrawing = target.checked;
        return;
    }

    const transformTarget = transformLayerNotDrawing
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
 * Applies transforms to the layer-container,
 * the currently active layer and its control points.
 */
function applyTransforms() {
    if (!session.current) return;

    const drawingTransforms = stringifyTransforms(drawing.dims.transforms);
    const layerTransforms = stringifyTransforms(session.current.transforms);
    const targets = [drawingContent, layers[session.layer], helperContainer];
    const values = [drawingTransforms, layerTransforms, drawingTransforms + layerTransforms];
    targets.forEach((t, i) => t.setAttribute('transform', values[i]));
}

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
        const [x1, y1] = getMousePos(svg, e);
        configElement(shape, attrs(x1, y1));
    };
}

/**
 * Changes the style-related attributes of a layer.
 * @param { number } [layerId=session.layer] The ordinal number of the affected layer. Defaults to the active layer.
 * @param { Object } [conf=drawing.layers[layerId].style] The container of style-related attributes of the affected layer.
 */
function styleLayer(layerId = session.layer, conf = drawing.layers[layerId].style) {
    const attrs = parseLayerStyle(conf);
    configElement(layers[layerId], attrs);
    save();
}

/**
 * Syncs geometry attributes of a layers representation w the data.
 * @param { number } [layerId=session.layer] The ordinal number of the affected layer. Defaults to the current.
 * @param { Object } [layer=drawing.layers[layerId]] The affected layer. Defaults to the current.
 */
function drawLayer(layerId = session.layer, layer = drawing.layers[layerId]) {
    let attrs;

    if (layer.mode === 'path') {
        attrs = {
            d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '')
        };
    } else if (layer.mode === 'ellipse') {
        attrs = {
            cx: layer.points[0].cx,
            cy: layer.points[0].cy,
            rx: layer.points[0].rx || 0,
            ry: layer.points[0].ry || 0
        };
    } else if (layer.mode === 'rect') {
        attrs = {
            x: layer.points[0].x,
            y: layer.points[0].y,
            width: layer.points[0].width || 0,
            height: layer.points[0].height || 0
        };
    }

    configElement(layers[layerId], attrs);
    save();
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
 * The interface for control point (cp) creation (callback for on layerswitch and load; also called for a single point on mousedown)
 * @param { Object } point The point that should be controlled.
 * @param { number } pointId The ordinal number of the point within its layer (needed for highlighting).
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
    helperContainer.append(...cps);
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
 * @returns { Function } The event-handler executed when dragging the cp.
 */
// TODO cant we store the effects applied to the cps in controlPointTypes as well?
function dragging(layer, pointId, controlPointType, controlPoint) {
    const args = controlPointTypes[controlPointType];
    const argsKeys = Object.keys(args);
    const point = layer.points[pointId];
    // collect the affected cps and the effects applied to them
    const toBeDragged = [{ ref: controlPoint, fx: [] }];

    if (!['rectLowerRight', 'ellipseRy', 'vCmd'].includes(controlPointType)) {
        toBeDragged[0].fx.push(({ x }) => ({ cx: x }));
    }

    if (!['rectLowerRight', 'ellipseRx', 'hCmd'].includes(controlPointType)) {
        toBeDragged[0].fx.push(({ y }) => ({ cy: y }));
    }

    // we don't want the lower right edge of a rect to move above or left of its anchor
    if (controlPointType === 'rectLowerRight') {
        toBeDragged[0].fx.push(
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

    const amounts = {
        M: 1,
        L: 1,
        H: 1,
        V: 1,
        Q: 2,
        C: 3,
        A: 1
    };

    const getIdOfControlPoint = (layer, id) => layer.points
        .slice(0, id)
        .reduce((cps, point) => cps + amounts[point.cmd], 0);

    // move cps of affected V and H cmds
    if (point.cmd && layer.points[pointId + 1]) {
        if (layer.points[pointId + 1].cmd === 'V') {
            toBeDragged.push({
                ref: controlPoints[getIdOfControlPoint(layer, pointId + 1)],
                fx: [
                    ({ x }) => ({ cx: x })
                ]
            });
        } else if (layer.points[pointId + 1].cmd === 'H') {
            toBeDragged.push({
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
        toBeDragged.push({
            ref: controlPoints[1],
            fx: [
                ({ x }) => ({ cx: x + point.width }),
                ({ y }) => ({ cy: y + point.height })
            ]
        });
    } else if (args.cx) {
        toBeDragged.push({
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
        const [x, y] = getMousePos(svg, e);

        // update the dragged points data
        argsKeys.forEach(key => Object.assign(point, {
            [key]: args[key]({ x, y }, point)
        }));

        // update the affected layer's visual representation
        drawLayer();

        // move the affected cp(s)
        toBeDragged.forEach((currentCp) => {
            configElement(currentCp.ref, currentCp
                .fx
                .reduce((keyValPairs, keyVal) => Object.assign(keyValPairs, keyVal({ x, y })), {}));
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
 * Moves a layer in accordance with a pressed arrow-key.
 */
function move(key, points) {
    const { props, cb } = moves[key];

    points.forEach((point) => {
        props.forEach((prop) => {
            // eslint-disable-next-line no-prototype-builtins
            if (point.hasOwnProperty(prop)) {
                point[prop] = cb(point[prop]);
            }
        });
    });
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
    xmlns="${ns}"
    width="${drawing.dims.width}" 
    height="${drawing.dims.height}" 
    viewBox="${[x, y, width, height].join(' ')}" 
    transform="${drawingTransforms}" 
    preserveAspectRatio="${[ratio.value, meetOrSlice.value].join(' ')}">
    ${drawingContent.innerHTML}
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