/* globals window, document, MutationObserver */

import {
    proxiedSessionKeys,
    defaults,
    controlPointTypes,
    moves
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
    getViewBox,
    stringifyTransforms
} from './helper-functions.js';
import setFillAndStrokeFields from './components/fillAndStrokeSyncer.js';

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
const cmds = ['M', 'L', 'H', 'V', 'Q', 'C', 'A']; // TODO: mov out?!...to commands or constants?...if we find a way to reliably sync session.cmd we can quite easily
const aCmdConfig = document.getElementById('a-cmd-config');
// SVG
const svg = document.getElementById('outer-container');
const drawingContent = svg.getElementById('inner-container');
const drawingBoundingRect = svg.getBoundingClientRect();
const layers = drawingContent.children;
const helperContainer = svg.getElementById('svg-helpers');
const overlay = svg.getElementById('overlay');
const controlPoints = svg.getElementsByClassName('control-point');
let transformLayerNotDrawing;

const drawing = {};
const proxiedKeys = proxiedSessionKeys(
    commands,
    aCmdConfig,
    cmds,
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

// watch for addition and removal of layers and do some synchronisation
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
    // TODO: sync aCmdConfig...on layer switch too?!
    // TODO: transform fieldsets too

    transformLayerNotDrawing = document.querySelector('[name=target-switch]').checked;

    configElement(svg, {
        height: window.innerHeight - drawingBoundingRect.top
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
});

// NOTE: to not have to move control points around when moving a layer,
// they're removed and thus need to be re-added when stoping to move
window.onkeyup = (e) => {
    const isArrowKey = !!moves[e.key];
    if (!e.ctrlKey && isArrowKey) {
        session.current.points.forEach(mkControlPoint);
    }
};

window.onkeydown = (e) => {
    const { key } = e;
    const isArrowKey = !!moves[key];

    if (isArrowKey) {
        e.preventDefault();

        // translate the entire drawing when the ctrl key is pressed
        if (e.ctrlKey) {
            const action = moves[key][1];

            drawing.dims.transforms.translate[moves[key][0][0] === 'x' ? 0 : 1] = key.match(/Arrow(?:Up|Down)/)
                ? action(drawing.dims.transforms.translate[1])
                : action(drawing.dims.transforms.translate[0]);

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

    // TODO dragging layer other than active, feels weird
    session.layer = droppedOnId;
    layerSelectors[session.layer].checked = true;

    // insert dragged before or after depending on its origin
    if (draggedId < droppedOnId) {
        droppedOnLayer.after(draggedLayer);
    } else {
        drawingContent.insertBefore(draggedLayer, droppedOnLayer);
    }

    reorderLayerSelectors(Math.min(draggedId, droppedOnId), Math.max(draggedId, droppedOnId));
};

addLayerBtn.onclick = () => {
    // create new vanilla layer data and set session-focus to it
    session.layer = drawing
        .layers
        .push({
            mode: session.mode,
            points: [],
            style: Object.assign({}, defaults.style), // FIXME: when triggered by eg mode switch, what if the user configs style before drawing?
            transforms: JSON.parse(JSON.stringify(defaults.dims.transforms))
        }) - 1;
    save();

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

    const [x, y] = getMousePos(drawingBoundingRect, e);
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

        // for M and L cmds, this is enough (for H and V its even too much)
        points.push({ cmd: session.cmd, x, y });

        // for Q, C and A cmds we need to add cp(s)
        if (session.cmd === 'Q') {
            const cp = quad([x, y], points[points.length - 2]);
            Object.assign(points[points.length - 1], cp);
        } else if (session.cmd === 'C') {
            const cps = cube([x, y], points[points.length - 2]);
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

aCmdConfig.oninput = ({ target }) => {
    if (!session.current) return;

    session.arcCmdConfig[target.name] = target[
        target.type === 'checkbox' ? 'checked' : 'value'
    ];

    // TODO: find a better way to change an A cmd...there might be more than one in a layer and how would we tell which is meant?
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
    // FIXME: if done before layer has points (ie on start for a blank canvas) this causes an exception
    drawing
        .layers[session.layer]
        .style[target.name] = target[
            target.type === 'checkbox' ? 'checked' : 'value'
        ];

    if (target.id === 'close-toggle') {
        drawLayer();
    } else {
        styleLayer();
    }
};

document.getElementById('transformations').oninput = ({ target }) => {
    if (target.name === 'target-switch') {
        transformLayerNotDrawing = target.checked;
        return;
    }

    const transformTarget = transformLayerNotDrawing // FIXME: layer wo points causes exception
        ? session.current
        : drawing.dims;

    let value;
    if (target.name === 'rotate') {
        const [
            xMin, yMin, width, height
        ] = getViewBox(transformTarget === session.current ? [transformTarget] : drawing.layers);
        const middleOfTransformTarget = [xMin + (width * 0.5), yMin + (height * 0.5)];
        value = [target.value, ...middleOfTransformTarget].join(',');
    } else {
        ({ value } = target);
    }

    transformTarget.transforms[target.name] = value;
    applyTransforms();
    save();
};

document.getElementById('preview')
    .onclick = () => window.open('').document.write(generateMarkUp());

document.getElementById('get-markup')
    .onclick = () => window.navigator.clipboard.writeText(generateMarkUp());

/**
 * Applies configured transforms to the currently active layer and the entire svg-canvas. Takes care of control points and the overlay as well.
 */
function applyTransforms() {
    const drawingTransforms = stringifyTransforms(drawing.dims.transforms);
    const layerTransforms = stringifyTransforms(session.current.transforms);
    const targets = [drawingContent, layers[session.layer], helperContainer];
    const values = [drawingTransforms, layerTransforms, drawingTransforms + layerTransforms];
    targets.forEach((t, i) => t.setAttribute('transform', values[i]));
}

/**
 * Adjusts layer-ids and labels of layers and selectors affected by re-ordering or deletion.
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
 * Returns a eventHandler for drawing a shape (ellipse or rect).
 * @param { SVGEllipseElement | SVGRectElement } shape The shape being drawn.
 * @param { Function } attrs A lambda evaluating to the respective attributes when given the current mouse-position.
 * @returns { Function }
 */
function drawShape(shape, attrs) {
    return (e) => {
        const [x1, y1] = getMousePos(drawingBoundingRect, e);
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
        // TODO: w H and V this looks weird...create new cp-type to handle them
        cps.push(ControlPoint(point.x, point.y, pointId, 'regularPoint'));

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
        // TODO: only one to control rx and ry like for rect?
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
        // so the hilight is shown prior to movement
        hilightSegment(layer, pointId, controlPointType);
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
 * @returns { Function }
 */
function dragging(layer, pointId, controlPointType, controlPoint) {
    const args = controlPointTypes[controlPointType];
    const point = layer.points[pointId];
    // collect the affected cps and the effects applied to them
    const cps = [{ ref: controlPoint, fx: [] }];

    if (point.cmd !== 'V' && controlPointType !== 'ellipseRy') {
        cps[0].fx.push(({ x }) => ({ cx: x }));
    }

    if (point.cmd !== 'H' && controlPointType !== 'ellipseRx') {
        cps[0].fx.push(({ y }) => ({ cy: y }));
    }

    // if the dragged cp is the anchor of a rect or ellipse, we want to move the related cp(s) too
    if (session.mode === 'rect' && args.x) {
        cps.push({
            ref: controlPoints[1],
            fx: [
                ({ x }) => ({ cx: x + point.width }),
                ({ y }) => ({ cy: y + point.height })
            ]
        });
    } else if (session.mode === 'ellipse' && args.cx) {
        cps.push({
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
        const [x, y] = getMousePos(drawingBoundingRect, e);

        // update the dragged points data
        Object.keys(args).forEach(key => Object.assign(point, {
            [key]: args[key]({ x, y }, point)
        }));

        // update the affected layer's visual representation
        drawLayer();

        // visualize affected path segment
        hilightSegment(layer, pointId, controlPointType);

        // move the affected cp(s)
        cps.forEach((currentCp) => {
            configElement(currentCp.ref, currentCp
                .fx
                .reduce((keyValPairs, keyVal) => Object.assign(keyValPairs, keyVal({ x, y })), {}));
        });
    };
}

/**
 * Highlights path-segment(s) affected by dragging a cp, by configuring the overlay to coincide w the affected segment(s), settings its color (which is filtered via css) and making it 4px wider than the highlighted segment.
 * @param { Object } [{ points }=session.current] The set of points belonging to the affected layer.
 * @param { number } pointId The ordinal number of the point within its layer.
 * @param { string } controlPointType The "type" of cp being dragged.
 */
function hilightSegment({ points } = session.current, pointId, controlPointType) {
    if (points.length <= 1) return;

    const closed = session.current.style.close;
    let d = 'M ';

    // dragged point is last of the layer or not a regular point
    if (pointId === points.length - 1 || controlPointType !== 'regularPoint') {
        d += `${[points[pointId - 1].x, points[pointId - 1].y].join(' ')
        }${pointToMarkup(points[pointId])
        }${closed
            ? `L${[points[0].x, points[0].y].join(' ')}`
            : ''}`;
        // dragged point is the first point of the layer
    } else if (pointId === 0) {
        d += `${closed ? `${[
            points[points.length - 1].x,
            points[points.length - 1].y]
            .join(' ')}L` : ''}${[points[0].x, points[0].y].join(' ')}
        ${pointToMarkup(points[1])}`;
    } else {
        d += `${[points[pointId - 1].x, points[pointId - 1].y].join(' ')}
        ${pointToMarkup(points[pointId])}
        ${pointToMarkup(points[pointId + 1])}`;
    }

    configElement(overlay, {
        'stroke-width': +session.current.style.strokeWidth + 4,
        stroke: session.current.style.strokeColor,
        d
    });
}

/**
 * Removes dragging-related eventlisteners from svg and resets the overlay.
 */
function stopDragging() {
    svg.onmousemove = null;
    svg.onmouseleave = null;
    svg.onmouseup = null;
    overlay.setAttribute('d', '');
}

/**
 * Moves a layer in accordance with a pressed arrow-key.
 */
function move(key, points) {
    const [props, action] = moves[key];

    points.forEach((point) => {
        props.forEach((prop) => {
            // eslint-disable-next-line no-prototype-builtins
            if (point.hasOwnProperty(prop)) {
                point[prop] = action(point[prop]);
            }
        });
    });
}

/**
 * Returns the markup of the created drawing (the content of group) inside default svg markup.
 */
function generateMarkUp() {
    const viewBox = getViewBox(drawing.layers).join(' ');

    return `
    <svg 
    xmlns="${ns}"
    width="${drawing.dims.width}" 
    height="${drawing.dims.height}" 
    viewBox="${viewBox}" 
    transform="${drawing.dims.transforms}" 
    preserveAspectRatio="${[ratio.value, meetOrSlice.value].join(' ')}">
    ${drawingContent.innerHTML}
    </svg>`
        .replace(/ data-layer-id="\d+?"/g, '');
}

/**
 * Saves the drawing-data to localStorage.
 */
function save() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}