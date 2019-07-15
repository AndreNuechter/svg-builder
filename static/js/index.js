/* globals window, document, MutationObserver */

import {
    quad,
    cube
} from './commands.js';
import {
    configElement,
    configClone,
    parseLayerStyle,
    getMousePos,
    pointToMarkup
} from './helper-functions.js';
import {
    moves,
    move,
    scale,
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
// Dimensions fieldset
const dims = document.getElementById('dims');
const widthSetter = document.getElementById('width');
const heightSetter = document.getElementById('height');
// Modes fieldset and enum of allowed values
const modeSelector = document.getElementById('modes');
const modes = ['path', 'rect', 'ellipse'];
// SVG
const svg = document.getElementById('outer-container');
const group = svg.getElementById('inner-container');
const layers = group.children;
const overlay = svg.getElementById('overlay');
const circleCPs = svg.getElementsByTagName('circle');
const rectCPs = svg.getElementsByClassName('rectCp'); // TODO: rename
// Coords display (visible when hovering svg) and the cb to manage that
const coords = document.getElementById('coords');
const coordToolTips = (e) => {
    const [x, y] = getMousePos(svg, e);
    coords.textContent = `x: ${x}, y: ${y}`;
    coords.style.left = `${e.pageX + 16}px`;
    coords.style.top = `${e.pageY - 32}px`;
};
// Path commands (visible when in 'path' mode) and enum of allowed values
const commands = document.getElementById('commands');
const cmds = ['M', 'L', 'H', 'V', 'Q', 'C', 'A'];
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
// Target for svg markup
const output = document.getElementById('output');

// determines the props of the affected point the cp is gonna change when moved via dragging
const controlPointTypes = [
    // regular point/upper right corner of rect
    [
        { key: 'x', callback: x => x },
        { key: 'y', callback: (x, y) => y }
    ],
    // cp1
    [
        { key: 'x1', callback: x => x },
        { key: 'y1', callback: (x, y) => y }
    ],
    // cp2
    [
        { key: 'x2', callback: x => x },
        { key: 'y2', callback: (x, y) => y }
    ],
    // center of an ellipse
    [
        { key: 'cx', callback: x => x },
        { key: 'cy', callback: (x, y) => y }
    ],
    // lower left corner of rect
    [
        { key: 'width', callback: (x, y, layer, pointId) => Math.abs(x - layer.points[pointId].x) },
        { key: 'height', callback: (x, y, layer, pointId) => Math.abs(y - layer.points[pointId].y) }
    ],
    // controlling width of ellipse
    [
        { key: 'rx', callback: (x, y, layer, pointId) => Math.abs(x - layer.points[pointId].cx) }
    ],
    // controlling height of ellipse
    [
        { key: 'ry', callback: (x, y, layer, pointId) => Math.abs(y - layer.points[pointId].cy) }
    ]
];

const defaultConfig = {
    dims: {
        width: 640,
        height: 360
    },
    style: {
        strokeColor: '#000000',
        strokeOpacity: 1,
        strokeWidth: 2,
        fillColor: '#000000',
        fillOpacity: 1,
        fillRule: 'evenodd',
        fill: false,
        close: false
    }
};

const drawing = {};

// partially initialize session and define a trap on set
const session = new Proxy({
    cmd: 'M',
    drawingShape: false,
    shapeStart: {}
}, {
    set(obj, key, val) {
        if (key === 'mode' && modes.includes(val)) {
            obj[key] = val;
            // check the mode
            document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
            // show/hide cmds depending on mode
            commands.style.display = val === 'path' ? 'flex' : 'none';
            return true;
        }

        if (key === 'cmd' && cmds.includes(val)) {
            obj[key] = val;
            // check cmd selector
            document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
            return true;
        }

        if (key === 'layer' && (+val >= 0 && +val <= drawing.layers.length)) {
            obj[key] = val;
            // set mode
            session.mode = drawing.layers[val].mode;
            // rem cps of prev layer
            remControlPoints();
            // add cps for curr layer
            if (drawing.layers[val].points.length) {
                drawing.layers[val].points.forEach(mkPoint);
            }
            // adjust Fill & Stroke
            setFillNStrokeFields();
            return true;
        }

        if (key === 'drawingShape' && typeof val === 'boolean') {
            obj[key] = val;
            return true;
        }

        return false;
    }
});

// create and organize used elements
const selectorTemplate = (() => configElement(document.createElement('input'), {
    type: 'radio',
    name: 'layer'
}))();
const labelTemplate = document.createElement('label');
const ns = 'http://www.w3.org/2000/svg';
const pathTemplate = document.createElementNS(ns, 'path');
const rectTemplate = document.createElementNS(ns, 'rect');
const ellipseTemplate = document.createElementNS(ns, 'ellipse');
const circleTemplate = document.createElementNS(ns, 'circle');
const svgTemplates = { path: pathTemplate, rect: rectTemplate, ellipse: ellipseTemplate };

// watch for addition and removal of layers and do some synchronisation
new MutationObserver((mutationsList) => {
    // hide/show a message when no layers exist
    vacancyMsgStyle.display = group.children.length ? 'none' : 'initial';

    mutationsList.forEach((mutation) => {
        // deal w addition of layer (add a corresponding selector)
        if (mutation.addedNodes.length) {
            const label = configClone(labelTemplate)({
                textContent: `Layer ${layerSelect.childElementCount + 1}`,
                'data-layer-id': layerSelect.childElementCount
            });
            const selector = configClone(selectorTemplate)({
                value: layerSelect.childElementCount,
                checked: session.layer === layerSelectors.length
            });

            label.append(selector);
            layerSelect.append(label);
        }

        // deal w removal of layer(s)
        if (mutation.removedNodes.length) {
            // delete selector
            const id = mutation
                .removedNodes[0]
                .getAttribute('data-layer-id');
            layerSelect
                .querySelector(`label[data-layer-id="${id}"]`)
                .remove();

            // if there're no layers left and we havent done so yet, we do some clean-up and are done
            if (!layers.length) {
                // eslint-disable-next-line no-prototype-builtins
                if (session.hasOwnProperty('layer')) {
                    delete session.layer;
                    remControlPoints();
                    setFillNStrokeFields(defaultConfig.style);
                }
                return;
            }

            // if it was the newest layer that has been removed, we decrement session.layer
            if (session.layer === layers.length) {
                session.layer -= 1;
            } else {
                // NOTE: if the deleted item wasnt the last, session.layer did not change, but the formerly selected layer is gone
                // set session.mode to that of the active layer
                session.mode = drawing.layers[session.layer].mode;
                // rem cps of prev layer
                remControlPoints();
                // mk cps of current layer
                drawing.layers[session.layer].points.forEach(mkPoint);
                // config Stroke n Fill
                setFillNStrokeFields();
                // re-configure subsequent selectors and layer ordinals
                for (let i = session.layer; i < layerSelect.children.length; i += 1) {
                    const selectorParts = [...layerSelect.children[i].childNodes];
                    selectorParts[0].data = `Layer ${i + 1}`;
                    selectorParts[1].value = i;
                    layerSelect.children[i].setAttribute('data-layer-id', i);
                    layers[i].setAttribute('data-layer-id', i);
                }
            }

            // check the active layer's selector
            layerSelectors[session.layer].checked = true;
        }
    });
}).observe(group, { childList: true });

window.addEventListener('DOMContentLoaded', () => {
    // if there's a saved drawing, use it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing')) || {};
    Object.assign(drawing, {
        dims: src.dims || defaultConfig.dims,
        layers: src.layers || []
    });

    // initialize mode to that of the first layer or the default
    session.mode = (drawing.layers[0] && drawing.layers[0].mode)
        ? drawing.layers[0].mode
        : 'path';

    // initialize session.layer, if there're layers
    if (drawing.layers.length) session.layer = 0;

    // create layers incl selectors and config ea
    drawing.layers.forEach((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const attrs = Object
            .assign({ 'data-layer-id': i },
                layer.mode === 'path' ? {
                    d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '')
                } : layer.points[0] || {},
                parseLayerStyle(layer.style));

        // add configured shape to the html
        group.append(configClone(shape)(attrs));
    });

    // adjust inputs for changing the dimensions of the drawing
    widthSetter.value = drawing.dims.width;
    heightSetter.value = drawing.dims.height;

    // possibly resize the canvas
    setDimsOfSVG();
});

window.onkeydown = (e) => {
    const { key } = e;

    if (moves[key]) {
        e.preventDefault();
        move(key, drawing.layers[session.layer].points);
        drawLayer();
    } else if (key === 'Backspace') {
        e.preventDefault();
        undoBtn.click();
    } else if (!e.ctrlKey && cmds.includes(key.toUpperCase())) {
        e.preventDefault();
        session.cmd = key.toUpperCase();
    }
};

// Layers
layerSelect.onchange = ({ target }) => {
    session.layer = +target.value;
};

addLayerBtn.onclick = () => {
    // create new vanilla layer data and set session-focus to it
    session.layer = drawing
        .layers
        .push({
            mode: session.mode,
            points: [],
            style: Object.assign({}, defaultConfig.style) // FIXME: when triggered by eg mode switch, what if the user configs style before drawing?
        }) - 1;
    save();

    // create layer and selector in HTML
    const shape = configClone(svgTemplates[session.mode])({
        'data-layer-id': session.layer
    });
    group.append(shape);
};

// deletes the active layer
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
    drawing.dims = Object.assign({}, defaultConfig.dims);

    // remove all layers incl selectors
    [...layers].forEach(layer => layer.remove());
};

undoBtn.onclick = () => {
    if (drawing.layers[session.layer].points.length) {
        remLastControlPoint(drawing.layers[session.layer].points.pop().cmd);
        drawLayer();
    }
};

// adds a point
svg.addEventListener('mousedown', (e) => {
    if (!layers.length) addLayerBtn.click();

    const [x, y] = getMousePos(svg, e);
    const layer = drawing.layers[session.layer];

    // drawing a rect or ellipse
    if (session.drawingShape) {
        // TODO: allow stopping creation by pressing esc?
        // stop drawing
        session.drawingShape = false;
        svg.onmousemove = '';

        // collect the shapes attrs
        const size = {
            hor: Math.abs(session.shapeStart.x - x),
            vert: Math.abs(session.shapeStart.y - y)
        };
        let attrs;

        if (session.mode === 'rect') {
            attrs = {
                x: Math.min(session.shapeStart.x, x),
                y: Math.min(session.shapeStart.y, y),
                width: size.hor,
                height: size.vert
            };
        } else {
            attrs = {
                rx: size.hor,
                ry: size.vert
            };
        }

        // commit em
        Object.assign(layer.points[0], attrs);

        // create cps for the new layer
        mkPoint(layer.points[layer.points.length - 1], layer.points.length - 1);
    } else if (session.mode === 'rect') {
        if (layer.points[0]) return;

        const rect = layers[session.layer];

        layer.points[0] = { x, y };

        configElement(rect, layer.points[0]);

        session.drawingShape = true;
        [session.shapeStart.x, session.shapeStart.y] = [x, y];

        svg.onmousemove = (ev) => {
            const [x1, y1] = getMousePos(svg, ev);

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

        svg.onmousemove = (ev) => {
            const [x1, y1] = getMousePos(svg, ev);

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
        if (layer.points.length === 0) {
            session.cmd = 'M';
        }

        // ensure there're no multiple consecutive moveTo commands
        if (lastPoint && lastPoint.cmd === 'M' && session.cmd === 'M') {
            layer.points.pop();
            remLastControlPoint(session.cmd);
        }

        // for M and L cmds, this is enuff (for H and V its even too much)
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
            // TODO: arc func...how to control props? rethink defaults

            Object.assign(layer.points[layer.points.length - 1], {
                xR: 50,
                yR: 50,
                xRot: 0,
                large: 1,
                sweep: 1
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
    [coords.style.top, coords.style.left] = ['-100px', '-100px'];
});

// Commands (only visible when in path mode)
commands.onchange = ({ target }) => {
    session.cmd = cmds[cmds.indexOf(target.value)] || cmds[0];
};

// NOTE: we want to keep svg.style.dims, drawing.dims and the two responsible number inputs in sync... best way may be to never actually do the below, make svg comfortably large and only use dims on markup?!
function setDimsOfSVG() {
    svg.style.width = `${drawing.dims.width}px`;
    svg.style.height = `${drawing.dims.height}px`;
}
// Dimensions of canvas
dims.onchange = ({ target }) => {
    drawing.dims[target.id] = target.value || drawing.dims[target.id];
    svg.style[target.id] = `${drawing.dims[target.id]}px`;
    save();
};

// Modes
modeSelector.onchange = ({ target }) => {
    session.mode = modes.includes(target.value) ? target.value : session.mode;

    // if we change the mode on an existing layer, we add a new layer
    // if the layer has not been edited yet, we replace the shape and the mode
    if (layers[session.layer]) {
        if (drawing.layers[session.layer].points.length) {
            addLayerBtn.click();
        } else {
            drawing.layers[session.layer].mode = session.mode;
            const shape = configClone(svgTemplates[session.mode])({
                'data-layer-id': session.layer
            });
            group.replaceChild(shape, layers[session.layer]);
        }
    }
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
transformBtn.onclick = () => {
    if (+scalingFactor.value !== 1) {
        scale(+scalingFactor.value, drawing.layers[session.layer].points);
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
        setDimsOfSVG();
    }

    drawLayer();
};

output.onclick = generateMarkUp;

output.ondblclick = () => {
    const range = document.createRange();

    range.selectNodeContents(output);
    window.getSelection().addRange(range);
    document.execCommand('copy');
};

/**
 * Adjusts the Fill & Stroke fieldset to a given config.
 * @param { Object } [conf=drawing.layers[session.layer].style] The config to be applied. Defaults to the one of the active layer.
 */
function setFillNStrokeFields(conf = drawing.layers[session.layer].style) {
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
 * Changes the style-related attributess of a layer (a svg path, rect or ellipse).
 * @param { number } [layerId=session.layer] The ordinal number of the affected Layer. Defaults to the active layer.
 * @param { Object } [conf=drawing.layers[layerId].style] The container of style-related attributes of the affected layer.
 */
function styleLayer(layerId = session.layer, conf = drawing.layers[layerId].style) {
    const attrs = parseLayerStyle(conf);

    configElement(layers[layerId], attrs);
    save();
}

/**
 * Syncs geometry attributes of a layers representation w the data
 * @param { number } [layerId=session.layer] The ordinal number of the affected layer. Defaults to the current.
 * @param { Object } [layer=drawing.layers[layerId]] The affected layer. Defaults to the current.
 */
function drawLayer(layerId = session.layer, layer = drawing.layers[layerId]) {
    const attrs = {};

    if (layer.mode === 'path') {
        Object.assign(attrs, {
            d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '')
        });
    } else if (layer.mode === 'ellipse') {
        Object.assign(attrs, {
            cx: layer.points[0].cx,
            cy: layer.points[0].cy,
            rx: layer.points[0].rx,
            ry: layer.points[0].ry
        });
    } else if (layer.mode === 'rect') {
        Object.assign(attrs, {
            x: layer.points[0].x,
            y: layer.points[0].y,
            width: layer.points[0].width,
            height: layer.points[0].height
        });
    }

    configElement(layers[layerId], attrs);
    save();
}

function remLastControlPoint(cmd) {
    circleCPs[circleCPs.length - 1].remove();
    if (cmd === 'Q' || cmd === 'C') rectCPs[rectCPs.length - 1].remove();
    if (cmd === 'C') rectCPs[rectCPs.length - 1].remove();
}
// TODO: should rem a single point incl cps, but rn duz so for every cp
function remControlPoints() {
    // TODO: to ensure there's no mem leak the eventListeners (onmouseenter, onmouseleave, onmousedown, onmouseup) might need to be explicitly removed...its easy to do, but maybe unnecesary, so set it up and compare perf
    [...circleCPs, ...rectCPs].forEach(c => c.remove());
}

const stopDragging = () => {
    svg.onmousemove = '';
    svg.onmouseleave = '';
    svg.onmouseup = '';
    overlay.setAttribute('d', '');
};

/**
 * The interface for control point (cp) creation (callback for on layerswitch and load; also called for a single point on mousedown)
 * @param { Object } point The point that should be controlled.
 * @param { number } pointId The ordinal number of the point within its layer (needed for highlighting).
 */
function mkPoint(point, pointId) {
    // NOTE: types are [0: point, 1: cp1, 2: cp2], since quadratic or cubic curves have 1 or 2 cps (this func is called trice for a cubic curve, excluding the first moveTo)...enumerate types: cp1, cp2, xy, x, y, ry, rx...?
    // for rects and ellipses this may need to change just one prop like width, height or x-rotation
    // regular point (eg moveTo)
    if (session.mode === 'path') {
        // TODO: duz this make sense w H and V? it looks weird
        mkControlPoint(point.x, point.y, pointId);

        // control point for Q and first one for C
        if (point.cmd === 'Q' || point.cmd === 'C') {
            mkControlPoint(point.x1, point.y1, pointId, 1);
        }

        // 2nd cp for C
        if (point.cmd === 'C') {
            mkControlPoint(point.x2, point.y2, pointId, 2);
        }

        // TODO: A cmd
    } else if (session.mode === 'rect') {
        // one to change x and y
        mkControlPoint(point.x, point.y, pointId);
        // one to change width and height
        mkControlPoint(point.x + point.width, point.y + point.height, pointId, 4);
    } else if (session.mode === 'ellipse') {
        // one to change cx and cy
        mkControlPoint(point.cx, point.cy, pointId, 3);
        // one to change rx
        mkControlPoint(point.cx - point.rx, point.cy, pointId, 5);
        // one to change ry
        mkControlPoint(point.cx, point.cy - point.ry, pointId, 6);
        // only one to control rx and ry like for rect?
    }
}

// FIXME: the idea behind this seems half baked; c type param too...it's rather awkward...how to better phrase that? interactions w layer?
// sketch: this should take x and y coords and draw a specified shape there.
// Further it should register eventhandlers on it that will affect the current layers attrs in an appropriate way on drag
/**
 * Constructs a single draggable point to control some prop(s) of the active layer
 * @param { number } x The x-ccordinate of the cp.
 * @param { number } y The y-ccordinate of the cp.
 * @param { number } pointId The ordinal number of the point within its layer.
 * @param { number } [type=0] the "type" of cp we want to create.
 */
function mkControlPoint(x, y, pointId, type = 0) {
    // NOTE: not necessary since we are restricting to one layer, BUT allows cps to work even when switching layers
    const layerId = session.layer;

    // TODO: improve cp classNames
    const cp = configClone(circleTemplate)({
        cx: x,
        cy: y,
        r: 3,
        class: `node ${type ? 'rect' : 'circle'}Cp`
    });

    // start dragging on mousedown
    // NOTE: actual mutations are triggered by svg.onmousemove
    cp.onmousedown = (e) => {
        // prevent triggering svg.onmousedown and adding another point to the current path
        e.stopPropagation();
        // so the hilight is shown prior to movement
        hilightSegment(drawing.layers[layerId], pointId, type > 0);
        // update dragged point on mousemove
        svg.onmousemove = dragging(
            drawing.layers[layerId], pointId, type, cp
        );
        svg.onmouseleave = stopDragging;
        svg.onmouseup = stopDragging;
    };

    // stop dragging on mouseup
    cp.onmouseup = stopDragging;

    // add cp to the outer container to keep it out of the markup output
    svg.append(cp);
}

// TODO: duz this make sense for modes besides path? for rects we can highlight opposing sides; for ellipses diameters...the logic needs to change quite drastically for that
/**
 * Highlights segment(s) affected by dragging a cp, by configuring the overlay to coincide w the affected segment(s).
 * @param { Object } [{ points }=drawing.layers[session.layer]] The set of points belonging to the affected layer (extracted from the layer).
 * @param { number } pointId The ordinal number of the point within its layer.
 * @param { number } type The "type" of cp being dragged (it's a wack param)
 */
function hilightSegment({ points } = drawing.layers[session.layer], pointId, type) {
    if (points.length <= 1) return;

    let d;

    // TODO: check if shape is closed and highlight that part as well
    // what can we tell about the dragged point?
    if (pointId === points.length - 1 || type) {
        // it's the last point or not a regular point (eg cps for x1 and y1 only affect one segment no matter what)
        // mov to prev point and draw path to curr
        d = `M ${[points[pointId - 1].x, points[pointId - 1].y].join(' ')}
         ${pointToMarkup(points[pointId])}`;
    } else if (pointId === 0) {
        // it's the first point of the layer
        // mov to point and draw path to next
        d = `M ${[points[0].x, points[0].y].join(' ')}
         ${pointToMarkup(points[1])}`;
    } else {
        // it's a point in between
        // mov to prev point and draw path over curr to next
        d = `M ${[points[pointId - 1].x, points[pointId - 1].y].join(' ')}
         ${pointToMarkup(points[pointId])}
         ${pointToMarkup(points[pointId + 1])}`;
    }

    configElement(overlay, {
        stroke: 'orange', // TODO: if we're not changing this, it might as well be set in the HTML
        'stroke-width': +drawing.layers[session.layer].style.strokeWidth + 4,
        d
    });
}

/**
 * The eventHandler-factory for dragging a cp.
 * @param { Object } layer The layer the dragged cp affects.
 * @param { number } pointId The ordinal number of the point within layer the dragged cp belongs to.
 * @param { number } type The "type" of cp we're dealing with.
 * @param { SVGCircleElement } cp The cp that's to be dragged.
 * @param { Object[] } args An array of key-names and callbacks constituting the effect of dragging.
 * @returns { Function }
 */
function dragging(layer, pointId, type, cp) {
    return (e) => {
        // TODO: store pos in object and pass that to callback to facilitate destructuring?
        const [x, y] = getMousePos(svg, e);
        const args = controlPointTypes[type];

        // update the dragged points data
        args.forEach(arg => Object.assign(layer.points[pointId], {
            [arg.key]: arg.callback(x, y, layer, pointId)
        }));

        // update the dragged point's visual representation
        drawLayer();

        // visualize affected path segment
        hilightSegment(layer, pointId, type);

        // move the cp
        // NOTE: for H, V, rx or cy, y or x of the cp should keep steady
        // TODO: this is not enuff
        if (layer.points[pointId].cmd !== 'V' && type !== 6) {
            // FIXME: this highlighting is quite weird
            cp.setAttribute('cx', x);
            // TODO: move cp for counterpart
        }
        if (layer.points[pointId].cmd !== 'H' && type !== 5) {
            cp.setAttribute('cy', y);
            // TODO: move cp for counterpart
        }

        // if we move the anchor of a rect, the cp for width and height should move too
        // TODO: anchor of ellipse
        if (session.mode === 'rect' && args[0].key === 'x') {
            configElement(rectCPs[0], {
                cx: (x + layer.points[pointId].width),
                cy: (y + layer.points[pointId].height)
            });
        }
    };
}

/**
 * Generates and outputs the markup of the created drawing (the content of group).
 */
function generateMarkUp() {
    output.textContent = `
    <svg width="${drawing.dims.width}" height="${drawing.dims.height}">
    ${group.innerHTML}
    </svg>`;
}

/**
 * Saves the drawing.
 */
function save() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}