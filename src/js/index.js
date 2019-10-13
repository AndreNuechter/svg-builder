/* globals window, document, MutationObserver */

import {
    proxiedSessionKeys,
    defaults,
    controlPointTypes
} from './constants.js';
import {
    quad,
    cube
} from './commands.js';
import {
    configElement,
    configClone,
    parseLayerStyle,
    getMousePos,
    pointToMarkup,
    getViewBox
} from './helper-functions.js';
import {
    moves,
    move,
    scaleLayer,
    rotate,
    reflect,
    trim
} from './transformations.js';

// Layers fieldset
const vacancyMsgStyle = document.getElementById('no-layer-msg').style;
const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer');
const addLayerBtn = document.getElementById('add-layer');
const delLayerBtn = document.getElementById('del-layer');
const clearAllBtn = document.getElementById('clear-all');
const undoBtn = document.getElementById('undo');
// Dimensions fieldset and preserve aspect ratio related inputs
const dims = document.getElementById('dims');
const widthSetter = document.getElementById('width');
const heightSetter = document.getElementById('height');
const ratio = document.getElementById('ratio');
const meetOrSlice = document.getElementById('slice-or-meet');
// Modes fieldset
const modeSelector = document.getElementById('modes');
// SVG
const svg = document.getElementById('outer-container');
const drawingContent = svg.getElementById('inner-container');
const drawingBoundingRect = svg.getBoundingClientRect();
const layers = drawingContent.children;
const helperContainer = svg.getElementById('svg-helpers');
const overlay = svg.getElementById('overlay');
const controlPoints = svg.getElementsByClassName('control-point');
// Coords display (visible when hovering svg) and the cb to manage it
const coords = document.getElementById('coords');
const coordToolTips = (e) => {
    const [x, y] = getMousePos(drawingBoundingRect, e);
    coords.textContent = `x: ${x}, y: ${y}`;
    coords.style.left = `${e.pageX + 16}px`;
    coords.style.top = `${e.pageY - 32}px`;
};
// Path commands (visible when in 'path' mode) and enum of allowed values
const commands = document.getElementById('commands');
const cmds = ['M', 'L', 'H', 'V', 'Q', 'C', 'A']; // TODO: mov out?!
const aCmdConfig = document.getElementById('a-cmd-config');
// Fill & Stroke fieldset
const styleConfig = document.getElementById('fill-and-stroke');
const strokeColorSetter = document.getElementById('stroke-color');
const strokeOpacitySetter = document.getElementById('stroke-opacity');
const fillColorSetter = document.getElementById('fill-color');
const fillOpacitySetter = document.getElementById('fill-opacity');
const strokeWidthSetter = document.getElementById('stroke-width');
const fillRuleSetter = document.getElementById('fill-rule');
const fillToggle = document.getElementById('fill-toggle');
const closeToggle = document.getElementById('close-toggle');
// Transformations fieldset
const scalingFactor = document.getElementById('scaling-factor');
const deg = document.getElementById('deg');
const reflection = document.getElementById('reflect');
const trimChk = document.getElementById('trim-check');
const transformBtn = document.getElementById('transform');
const svgTransforms = document.getElementById('transforms');

const drawing = {};
const proxiedKeys = proxiedSessionKeys( // TODO do this earlier (needs some structural change)
    commands,
    aCmdConfig,
    closeToggle,
    cmds,
    drawing,
    remControlPoints,
    mkPoint,
    setFillAndStrokeFields
);
// partially initialize session and define a trap on set
const session = new Proxy(Object.assign({}, defaults.session), {
    set(obj, key, val) {
        const invalidKey = !Object.keys(proxiedKeys).includes(key);
        const invalidValue = !proxiedKeys[key].check(val);

        if (invalidKey || invalidValue) return false;

        obj[key] = val;
        proxiedKeys[key].onPass(val);

        return true;
    }
});
// create and organize used HTML/SVG elements
const labelTemplate = document.createElement('label');
const spanTemplate = document.createElement('span');
const selectorTemplate = (() => configElement(document.createElement('input'), {
    type: 'radio',
    name: 'layer'
}))();
const ns = 'http://www.w3.org/2000/svg';
const pathTemplate = document.createElementNS(ns, 'path');
const rectTemplate = document.createElementNS(ns, 'rect');
const ellipseTemplate = document.createElementNS(ns, 'ellipse');
const circleTemplate = (() => configElement(document.createElementNS(ns, 'circle'), {
    r: 3,
    class: 'control-point'
}))();
const svgTemplates = { path: pathTemplate, rect: rectTemplate, ellipse: ellipseTemplate };

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
            const label = configClone(labelTemplate)({
                'data-layer-id': layerId,
                draggable: true
            });
            const labelText = configClone(spanTemplate)({
                textContent: drawing.layers[layerId]
                    ? drawing.layers[layerId].label || `Layer ${layerId + 1}`
                    : `Layer ${layerId + 1}`,
                contenteditable: true
            });
            const selector = configClone(selectorTemplate)({
                value: layerId,
                checked: session.layer === layerSelectors.length
            });

            // enable re-ordering via dragging of label
            label.ondragstart = (e) => {
                e.dataTransfer.setData('text', e.target.dataset.layerId);
                e.dataTransfer.effectAllowed = 'move';
            };

            // save the custom label
            // NOTE: we assume edition is preceded by selection and the edited label belongs to the active layer
            labelText.oninput = ({ target }) => {
                drawing.layers[session.layer].label = target.textContent;
                save();
            };

            label.append(labelText, selector);
            layerSelect.append(label);
        }

        // deal w removal of layer(s)
        // TODO: this deserves a refactor
        if (mutation.removedNodes.length) {
            // delete selector
            const id = +mutation
                .removedNodes[0]
                .dataset
                .layerId;
            layerSelect
                .querySelector(`label[data-layer-id="${id}"]`)
                .remove();

            // if there're no layers left and we havent done so yet, we do some clean-up and are done
            if (!layers.length) {
                // eslint-disable-next-line no-prototype-builtins
                if (session.hasOwnProperty('layer')) {
                    delete session.layer;
                    remControlPoints();
                    setFillAndStrokeFields(defaults.style);
                }
                return;
            }

            // if it was the newest layer, we decrement session.layer
            if (session.layer === layers.length) {
                session.layer -= 1;
            } else {
                // set session.mode to that of the active layer
                session.mode = drawing.layers[session.layer].mode;
                // rem cps of prev layer
                remControlPoints();
                // mk cps of current layer
                drawing.layers[session.layer].points.forEach(mkPoint);
                // config Stroke n Fill
                setFillAndStrokeFields();
                // re-configure subsequent selectors and layer ids
                // TODO: stay DRY, sth. similar is done for re-ordering
                for (let i = id; i < layerSelect.childElementCount; i += 1) {
                    const selector = layerSelect.children[i];
                    selector.dataset.layerId = i;
                    layers[i].dataset.layerId = i;
                    selector.children[0].textContent = drawing.layers[i].label || `Layer ${i + 1}`;
                    selector.children[1].value = i;
                }
            }

            // check the active layer's selector
            layerSelectors[session.layer].checked = true;
        }
    });
}).observe(drawingContent, { childList: true });

window.addEventListener('DOMContentLoaded', () => {
    // TODO: sync aCmdConfig...on layer switch too?!

    configElement(svg, {
        height: window.innerHeight - drawingBoundingRect.top
    });

    // if there's a saved drawing, use it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing')) || {};
    Object.assign(drawing, {
        dims: src.dims || defaults.dims, // TODO: duz this lead to mutations of defaults.transform and defaults.transform.translate, which will then persist when re-assigning on clearAll?
        layers: src.layers || []
    });

    // initialize session.mode to that of the first layer or the default
    session.mode = (drawing.layers[0] && drawing.layers[0].mode)
        ? drawing.layers[0].mode
        : 'path';

    // initialize session.layer, if there're layers
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

        // add configured shape to the html
        drawingContent.append(configClone(shape)(attrs));
    });

    // adjust inputs for changing the dimensions of the drawing
    widthSetter.value = drawing.dims.width;
    heightSetter.value = drawing.dims.height;
});

window.onkeyup = (e) => {
    if (!e.ctrlKey && moves[e.key]) {
        drawing.layers[session.layer].points.forEach(mkPoint);
    }
};

window.onkeydown = (e) => {
    const { key } = e;

    if (moves[key]) {
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
        move(key, drawing.layers[session.layer].points);
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
    const droppedOnSelector = e.target.tagName === 'LABEL' ? e.target : e.target.parentNode;
    const droppedOnId = +droppedOnSelector.dataset.layerId;
    const droppedOnLayer = svg.querySelector(`[data-layer-id="${droppedOnId}"]`);
    const draggedId = +e.dataTransfer.getData('text');
    const draggedLayer = svg.querySelector(`[data-layer-id="${draggedId}"]`);

    // re-order the layer data
    const draggedLayerData = drawing.layers.splice(draggedId, 1)[0];
    drawing.layers.splice(droppedOnId, 0, draggedLayerData);
    save();

    // set session.layer to the slot dropped on
    session.layer = droppedOnId;

    // check the appropriate selector (could be done in proxy...)
    layerSelectors[session.layer].checked = true;

    // insert dragged layer before or after the one it's dropped on, depending on where it originated
    if (draggedId < droppedOnId) {
        droppedOnLayer.after(draggedLayer);
    } else {
        drawingContent.insertBefore(draggedLayer, droppedOnLayer);
    }

    // adjust affected layer-ids and labels
    // TODO: mov to a func, c. mutationObserver's delete branch
    const start = Math.min(draggedId, droppedOnId);
    const end = Math.max(draggedId, droppedOnId);
    for (let i = start; i <= end; i += 1) {
        const selector = layerSelect.children[i];
        selector.dataset.layerId = i;
        layers[i].dataset.layerId = i;
        selector.children[0].textContent = drawing.layers[i].label || `Layer ${i + 1}`;
        selector.children[1].value = i;
    }
};

addLayerBtn.onclick = () => {
    // create new vanilla layer data and set session-focus to it
    session.layer = drawing
        .layers
        .push({
            mode: session.mode,
            points: [],
            style: Object.assign({}, defaults.style) // FIXME: when triggered by eg mode switch, what if the user configs style before drawing?
        }) - 1;
    save();

    // config the appropriate shape
    const shape = configClone(svgTemplates[session.mode])({
        'data-layer-id': session.layer
    });

    // append the shape to the drawing
    drawingContent.append(shape);
};

delLayerBtn.onclick = () => {
    if (!layers.length) return;
    // delete data and commit the change
    drawing.layers.splice(session.layer, 1);
    save();
    // remove HTML part
    layers[session.layer].remove();
};

clearAllBtn.onclick = () => {
    // commit the changes
    window.localStorage.removeItem('drawing');
    // reset current data
    drawing.layers.length = 0;
    drawing.dims = Object.assign({}, defaults.dims);
    // remove HTML part
    [...layers].forEach(layer => layer.remove());
};

undoBtn.onclick = () => {
    const latestPoint = drawing.layers[session.layer].points.pop();

    if (!latestPoint) return;

    if (latestPoint.cmd) {
        remLastControlPoint(latestPoint.cmd);
        drawLayer();
    } else {
        // NOTE: to make this work properly for rects or ellipses (which don't have a cmd-prop),
        // we cache the layer-id, remove all attrs and re-add the layer-id.
        // This way changing mode works as expected.
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
    const layer = drawing.layers[session.layer];

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

        Object.assign(layer.points[0], attrs);
        mkPoint(layer.points[layer.points.length - 1], layer.points.length - 1);
    } else if (session.mode === 'rect') {
        if (layer.points[0]) return;

        const rect = layers[session.layer];

        layer.points[0] = { x, y };

        configElement(rect, layer.points[0]);

        session.drawingShape = true;
        [session.shapeStart.x, session.shapeStart.y] = [x, y];

        svg.onmousemove = (ev) => {
            const [x1, y1] = getMousePos(drawingBoundingRect, ev);

            configElement(rect, {
                x: Math.min(x, x1),
                y: Math.min(y, y1),
                width: Math.abs(x - x1),
                height: Math.abs(y - y1)
            });
        };
    } else if (session.mode === 'ellipse') {
        if (layer.points[0]) return;

        const ellipse = layers[session.layer];

        layer.points[0] = { cx: x, cy: y };

        configElement(ellipse, layer.points[0]);

        session.drawingShape = true;
        [session.shapeStart.x, session.shapeStart.y] = [x, y];

        // TODO: stay DRY, c. listener created above for rect
        svg.onmousemove = (ev) => {
            const [x1, y1] = getMousePos(drawingBoundingRect, ev);

            configElement(ellipse, {
                rx: Math.abs(x - x1),
                ry: Math.abs(y - y1)
            });
        };
    } else if (session.mode === 'path') {
        // check for implemented commands
        if (!cmds.includes(session.cmd)) return;

        const lastPoint = layer.points[layer.points.length - 1];

        // prevent pushing the same point multiple times in a row
        if (lastPoint
            && x === lastPoint.x
            && y === lastPoint.y) {
            return;
        }

        // ensure first point of a path is a moveTo command
        if (!layer.points.length) {
            // TODO: instead of changing, we could add a M near the added point, which might be more convenient
            session.cmd = 'M';
        }

        // ensure there're no multiple consecutive moveTo commands
        if (lastPoint && lastPoint.cmd === 'M' && session.cmd === 'M') {
            layer.points.pop();
            remLastControlPoint(session.cmd);
        }

        // for M and L cmds, this is enough (for H and V its even too much)
        layer.points.push({
            cmd: session.cmd,
            x,
            y
        });

        // for Q and C cmds we need to add 1 or 2 cp(s)
        if (session.cmd === 'Q') {
            const cp = quad([x, y], layer.points[layer.points.length - 2]);

            Object.assign(layer.points[layer.points.length - 1], {
                x1: cp.x,
                y1: cp.y
            });
        } else if (session.cmd === 'C') {
            const [cp1, cp2] = cube([x, y], layer.points[layer.points.length - 2]);

            Object.assign(layer.points[layer.points.length - 1], {
                x1: cp1.x,
                y1: cp1.y,
                x2: cp2.x,
                y2: cp2.y
            });
        } else if (session.cmd === 'A') {
            // TODO: arc func, rethink defaults

            Object.assign(layer.points[layer.points.length - 1], {
                xR: session.arcCmdConfig.xR,
                yR: session.arcCmdConfig.yR,
                xRot: session.arcCmdConfig.xRot,
                large: +session.arcCmdConfig.large,
                sweep: +session.arcCmdConfig.sweep
            });
        }

        // create a cp for the new point
        mkPoint(layer.points[layer.points.length - 1], layer.points.length - 1);
    }

    styleLayer();
    drawLayer();
}, false);

svg.addEventListener('mousemove', coordToolTips);
svg.addEventListener('mouseover', coordToolTips);
svg.addEventListener('mouseleave', () => {
    coords.style = null;
});

commands.onchange = ({ target }) => {
    session.cmd = cmds[cmds.indexOf(target.value)] || cmds[0];
};

dims.onchange = ({ target }) => {
    drawing.dims[target.id] = target.value || drawing.dims[target.id];
    save();
};

// Modes
modeSelector.onchange = ({ target }) => {
    session.mode = target.value;

    if (!layers[session.layer]) return;

    // NOTE: if we change the mode on an existing layer, we add a new layer
    // but if the layer has not been edited yet, we replace the shape and the mode
    if (drawing.layers[session.layer].points.length) {
        addLayerBtn.click();
    } else {
        drawing.layers[session.layer].mode = session.mode;
        const shape = configClone(svgTemplates[session.mode])({
            'data-layer-id': session.layer
        });
        drawingContent.replaceChild(shape, layers[session.layer]);
    }
};

aCmdConfig.oninput = ({ target }) => {
    if (!drawing.layers[session.layer]) return;

    session.arcCmdConfig[target.name] = target[
        target.type === 'checkbox' ? 'checked' : 'value'
    ];

    // TODO: find a better way to change a A cmd
    // there might be more than one in a layer and then how would we tell which is meant?
    // BUG: weird behavior when first changing (jumps to some value, perhaps the ones on drawing?!), might be fixt when syncing the config on start
    const lastACmd = drawing.layers[session.layer].points
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
styleConfig.oninput = ({ target }) => {
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

// Transformations
// TODO switch to svg transforms
transformBtn.onclick = () => {
    if (+scalingFactor.value !== 1) {
        scaleLayer(+scalingFactor.value, drawing.layers[session.layer].points);
    }

    if (+deg.value !== 0) {
        rotate(+deg.value, drawing.layers[session.layer].points);
    }

    if (reflection.selectedIndex) {
        reflect(reflection.children[reflection.selectedIndex].value,
            drawing.layers[session.layer].points);
    }

    if (trimChk.checked) {
        trim(drawing.layers[session.layer].points, drawing.dims, widthSetter, heightSetter);
    }

    drawLayer();
};

svgTransforms.oninput = ({ target }) => {
    drawing.dims.transforms[target.name] = target.value;
    applyTransforms();
};

document
    .getElementById('preview')
    .onclick = previewDrawing;

document
    .getElementById('get-markup')
    .onclick = () => window.navigator.clipboard.writeText(generateMarkUp());

/**
 * Adjusts the Fill & Stroke fieldset to a given config.
 * @param { Object } [conf=drawing.layers[session.layer].style] The config to be applied. Defaults to the one of the active layer.
 */
function setFillAndStrokeFields(conf = drawing.layers[session.layer].style) {
    strokeColorSetter.value = conf.strokeColor;
    strokeOpacitySetter.value = conf.strokeOpacity;
    fillColorSetter.value = conf.fillColor;
    fillOpacitySetter.value = conf.fillOpacity;
    strokeWidthSetter.value = conf.strokeWidth;
    [...fillRuleSetter.children].forEach((child) => {
        child.selected = (child.value === conf.fillRule);
    });
    fillToggle.checked = conf.fill;
    closeToggle.checked = conf.close;
}

/**
 * Changes the style-related attributess of a layer.
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

function applyTransforms() {
    const transform = Object
        .keys(drawing.dims.transforms)
        .reduce((str, key) => `${str}${key}(${drawing.dims.transforms[key]})`, '');

    [drawingContent, helperContainer].forEach(c => c.setAttribute('transform', transform));
}

function remLastControlPoint(cmd) {
    controlPoints[controlPoints.length - 1].remove();
    if (cmd === 'Q' || cmd === 'C') controlPoints[controlPoints.length - 1].remove();
    if (cmd === 'C') controlPoints[controlPoints.length - 1].remove();
}

function remControlPoints() {
    // NOTE: to ensure there's no mem leak the eventListeners (onmouseenter, onmouseleave, onmousedown, onmouseup) might need to be explicitly set to null...it may be unnecesary, so set it up and compare perf
    [...controlPoints].forEach(c => c.remove());
}

/**
 * The interface for control point (cp) creation (callback for on layerswitch and load; also called for a single point on mousedown)
 * @param { Object } point The point that should be controlled.
 * @param { number } pointId The ordinal number of the point within its layer (needed for highlighting).
 */
function mkPoint(point, pointId) {
    if (session.mode === 'path') {
        // TODO: w H and V this looks weird
        mkControlPoint(point.x, point.y, pointId, 'regularPoint');

        if (point.cmd === 'Q' || point.cmd === 'C') {
            mkControlPoint(point.x1, point.y1, pointId, 'firstControlPoint');
        }

        if (point.cmd === 'C') {
            mkControlPoint(point.x2, point.y2, pointId, 'secondControlPoint');
        }
    } else if (session.mode === 'rect') {
        mkControlPoint(point.x, point.y, pointId, 'regularPoint');
        mkControlPoint(point.x + point.width, point.y + point.height, pointId, 'rectLowerRight');
    } else if (session.mode === 'ellipse') {
        mkControlPoint(point.cx, point.cy, pointId, 'ellipseCenter');
        mkControlPoint(point.cx - point.rx, point.cy, pointId, 'ellipseRx');
        mkControlPoint(point.cx, point.cy - point.ry, pointId, 'ellipseRy');
        // TODO: only one to control rx and ry like for rect?
    }
}

/**
 * Constructs a single draggable point to control some prop(s) of the active layer.
 * @param { number } x The x-ccordinate of the cp.
 * @param { number } y The y-ccordinate of the cp.
 * @param { number } pointId The ordinal number of the point within its layer.
 * @param { string } [controlPointType] the type of cp we want to create.
 */
function mkControlPoint(x, y, pointId, controlPointType) {
    const layer = drawing.layers[session.layer];

    const cp = configClone(circleTemplate)({
        cx: x,
        cy: y
    });

    cp.onmousedown = (e) => {
        // prevent triggering svg.onmousedown
        e.stopPropagation();
        // so the hilight is shown prior to movement
        hilightSegment(layer, pointId, controlPointType);
        // update dragged point on mousemove
        svg.onmousemove = dragging(layer, pointId, controlPointType, cp);
        svg.onmouseleave = stopDragging;
        svg.onmouseup = stopDragging;
    };

    cp.onmouseup = stopDragging;

    // add cp to the helper container to keep it out of the markup output
    helperContainer.append(cp);
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
 * Highlights path-segment(s) affected by dragging a cp, by configuring the overlay to coincide w the affected segment(s), giving it a bright orange color and making it 4px wider than the highlighted segment.
 * @param { Object } [{ points }=drawing.layers[session.layer]] The set of points belonging to the affected layer.
 * @param { number } pointId The ordinal number of the point within its layer.
 * @param { string } controlPointType The "type" of cp being dragged.
 */
function hilightSegment({ points } = drawing.layers[session.layer], pointId, controlPointType) {
    if (points.length <= 1) return;

    let d = 'M ';

    // TODO: check if shape is closed and highlight that part as well
    // what can we tell about the dragged point?
    if (pointId === points.length - 1 || controlPointType !== 'regularPoint') {
        // it's the last point or not a regular point (eg cps for x1 and y1 only affect one segment no matter what)
        // mov to prev point and draw path to curr
        d += `${[points[pointId - 1].x, points[pointId - 1].y].join(' ')}
        ${pointToMarkup(points[pointId])}`;
    } else if (pointId === 0) {
        // it's the first point of the layer
        // mov to point and draw path to next
        d += `${[points[0].x, points[0].y].join(' ')}
        ${pointToMarkup(points[1])}`;
    } else {
        // it's a point in between
        // mov to prev point and draw path over curr to next
        d += `${[points[pointId - 1].x, points[pointId - 1].y].join(' ')}
        ${pointToMarkup(points[pointId])}
        ${pointToMarkup(points[pointId + 1])}`;
    }

    configElement(overlay, {
        'stroke-width': +drawing.layers[session.layer].style.strokeWidth + 4,
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
 * Returns the markup of the created drawing (the content of group) inside default svg markup.
 */
function generateMarkUp() {
    // TODO: add global transforms to output
    const viewBox = getViewBox(drawing.layers).join(' ');

    return `
    <svg 
    xmlns="${ns}"
    width="${drawing.dims.width}" 
    height="${drawing.dims.height}" 
    viewBox="${viewBox}" 
    preserveAspectRatio="${[ratio.value, meetOrSlice.value].join(' ')}">
    ${drawingContent.innerHTML}
    </svg>`
        .replace(/ data-layer-id="\d+?"/g, '');
}

function previewDrawing() {
    window.open('').document.write(generateMarkUp());
}

function save() { // TODO: have a proxy on drawing and only to this there?!
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}