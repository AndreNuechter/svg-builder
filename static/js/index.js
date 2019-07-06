/* eslint-disable import/extensions */
/* globals window, document, MutationObserver */

import {
    quad,
    cube
} from './commands.js';
import {
    hexToRGB,
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

// TODO: quite a few of the elements/nodeLists selected here are only referenced once, so dont need to clutter up the top

// Layers fieldset
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
const modeSelector = document.getElementsByName('modes');
const modes = ['path', 'rect', 'ellipse'];
// SVG
const svg = document.getElementById('outer-container');
const group = svg.getElementById('inner-container');
const layers = group.children;
const overlay = svg.getElementById('overlay');
const circleCPs = svg.getElementsByTagName('circle');
const rectCPs = svg.getElementsByClassName('rectCp');
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
const cmdSelect = document.getElementsByName('command');
const cmds = ['M', 'L', 'H', 'V', 'Q', 'C', 'A'];
// Fill & Stroke fieldset
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
        close: true
    }
};

const drawing = {};

// partially initialize session
const session = new Proxy({
    cmd: 'M',
    drawingRect: false,
    rectStart: {}
}, {
    set(obj, key, val) {
        if (key === 'mode' && modes.includes(val)) {
            document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
            commands.style.display = val === 'path' ? 'flex' : 'none';
            obj[key] = val;
            return true;
        }

        if (key === 'cmd' && cmds.includes(val)) {
            cmdSelect[cmds.indexOf(val.toUpperCase())].checked = true;
            obj[key] = val;
            return true;
        }

        if (key === 'layer' && (+val >= 0 && +val <= drawing.layers.length)) {
            obj[key] = val;
            return true;
        }

        if (key === 'drawingRect' && typeof val === 'boolean') {
            obj[key] = val;
            return true;
        }

        return false;
    }
});

const selectorTemplate = (() => {
    const input = configElement(document.createElement('input'), {
        type: 'radio',
        name: 'layer'
    });

    return input;
})();
const labelTemplate = document.createElement('label');
const ns = 'http://www.w3.org/2000/svg';
const pathTemplate = document.createElementNS(ns, 'path');
const rectTemplate = document.createElementNS(ns, 'rect');
const circleTemplate = document.createElementNS(ns, 'circle');
const ellipseTemplate = document.createElementNS(ns, 'ellipse');
const svgTemplates = { path: pathTemplate, rect: rectTemplate, ellipse: ellipseTemplate };

const groupObserver = new MutationObserver((mutationsList) => {
    // NOTE: observing duznt block the mutations
    document
        .getElementById('no-layer-msg')
        .style
        .display = group.children.length ? 'none' : 'initial';

    mutationsList.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            const label = cloneFromTemplate(labelTemplate)({
                textContent: `Layer ${layerSelect.childElementCount + 1}`,
                'data-layer-id': layerSelect.childElementCount
            });
            const selector = cloneFromTemplate(selectorTemplate)({
                value: layerSelect.childElementCount,
                checked: session.layer === layerSelectors.length
            });

            label.append(selector);
            layerSelect.append(label);
        }

        if (mutation.removedNodes.length) {
            const id = mutation
                .removedNodes[0]
                .getAttribute('data-layer-id');

            layerSelect
                .querySelector(`label[data-layer-id="${id}"]`)
                .remove();

            // if there're no layers left, we are done
            if (!layers.length) {
                delete session.layer;
                return;
            }

            if (session.layer === layers.length) {
                session.layer -= 1;
            } else {
                // if it wasnt, we have to re-configure subsequent selectors and the layers ordinals
                for (let i = session.layer; i < layerSelect.children.length; i += 1) {
                    const selectorParts = [...layerSelect.children[i].childNodes];
                    configElement(selectorParts[0], {
                        data: `Layer ${i + 1}`
                    });
                    selectorParts[1].value = i;
                    layerSelect.children[i].setAttribute('data-layer-id', i);
                    layers[i].setAttribute('data-layer-id', i);
                }
            }

            // check the active layer
            layerSelectors[session.layer].checked = true;
            // possibly change session.mode to that of the active layer
            session.mode = drawing.layers[session.layer].mode || session.mode;
        }
    });
});
groupObserver.observe(group, { childList: true });

// applies attrs and props to an HTMLElement
function configElement(element, keyValPairs) {
    // NOTE: the below 'exceptions' cannot be set by setAttribute as they're obj props, not node attrs
    const exceptions = ['checked', 'textContent', 'data'];

    Object.keys(keyValPairs).forEach((key) => {
        if (exceptions.includes(key)) {
            element[key] = keyValPairs[key];
        } else {
            element.setAttribute(key, keyValPairs[key]);
        }
    });

    return element;
}

function cloneFromTemplate(template) {
    return attrs => configElement(template.cloneNode(false), attrs);
}

// adjusts the interface elements to a config
function adjustConfigItems(conf = drawing.layers[session.layer].style) {
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

// TODO: refactor type param. its confusing and probably not future proof
// TODO: duz this make sense for modes besides path? for rects we can highlight opposing sides; for ellipses diameters...the logic needs to change quite drastically for that
// highlights segments affected by dragged cp
// configs overlay to coincide w affected segment and highlights that fact
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
        stroke: 'orange',
        'stroke-width': +drawing.layers[session.layer].style.strokeWidth + 4,
        d
    });
}

function dragging(layerId, pointId, type, cp, xKey, yKey) {
    return (e) => {
        // TODO: debounce?!
        const [x, y] = getMousePos(svg, e);

        // visualize affected path segment
        hilightSegment(drawing.layers[layerId], pointId, type);

        // move the cp
        if (type) { // TODO: forego branching...close over/capture changed attrs? can they be read off cp?
            cp.setAttribute('x', x);
            cp.setAttribute('y', y);
        } else {
            cp.setAttribute('cx', x);
            cp.setAttribute('cy', y);
        }

        // update the dragged points data and visual representation
        [
            drawing.layers[layerId].points[pointId][xKey],
            drawing.layers[layerId].points[pointId][yKey]
        ] = [x, y];
        drawLayer(layerId); // TODO: should dragging be restricted to current layer and the layerId removed?
    };
}

const stopDragging = () => {
    svg.onmousemove = '';
    svg.onmouseleave = '';
    svg.onmouseup = '';
    overlay.setAttribute('d', '');
};

// TODO: svgTemplates?!
const getShape = {
    // we use rects for cps and circles for regular points
    circle(x, y) {
        const attrs = {
            cx: x,
            cy: y,
            r: 3
        };

        return cloneFromTemplate(circleTemplate)(attrs);
    },
    rect(x, y) {
        const attrs = {
            x,
            y,
            width: 5,
            height: 5
        };

        return cloneFromTemplate(rectTemplate)(attrs);
    }
};

// TODO: this should take x and y coords and draw a specified shape there. Further it should register eventhandlers that will affect the current layer in an appropriate way when dragging the created shape
// would be nice if we could more clearly/reliably define what effect manipulation of a cp has on the affected layer; also looking at how to control circles, we probably need more cp types!?
// constructs a draggable point to control some prop(s) of the active layer
// FIXME: the idea behind this seems insufficient; c type param too...it's rather awkward
// for rects and ellipses this may need to change just one prop like width, height or x-rotation
// NOTE: types are [0: point, 1: cp1, 2: cp2], since quadratic or cubic curves have 1 or 2 cps (this func is called trice for a cubic curve, excluding the first moveTo)
function mkControlPoint(x, y, pointId, shapeName, type = 0) {
    if (!Object.keys(getShape).includes(shapeName)) return;

    const layerId = session.layer;
    const cp = getShape[shapeName](x, y);

    cp.classList.add('node', `${shapeName}Cp`);
    // TODO: enumerate types...cp1, cp2, xy, x, y, ry, rx,...

    // determine the props of the affected point the cp is gonna change when moved via dragging
    let xKey;
    let yKey;
    if (type === 0) { // regular point
        [xKey, yKey] = ['x', 'y'];
    } else if (type === 1) { // cp1
        [xKey, yKey] = ['x1', 'y1'];
    } else { // cp2
        [xKey, yKey] = ['x2', 'y2'];
    }

    // start dragging on mousedown
    // NOTE: actual mutations are triggered by svg.onmousemove
    cp.onmousedown = (e) => {
        // prevent triggering svg.onmousedown and adding another point to the current path
        e.stopPropagation();
        // so the hilight is shown prior to movement
        hilightSegment(drawing.layers[layerId], pointId, type > 0);
        // update dragged point on mousemove
        svg.onmousemove = dragging(layerId, pointId, type, cp, xKey, yKey);
        svg.onmouseleave = stopDragging;
        svg.onmouseup = stopDragging;
    };

    // stop dragging on mouseup
    cp.onmouseup = stopDragging;

    // add cp to the outer container to keep it out of the markup output
    svg.append(cp);
}

function mkPoint(point, pointId) {
    // draw a point incl cps
    mkControlPoint(point.x || point.cx, point.y || point.cy, pointId, 'circle');

    if (point.cmd === 'Q' || point.cmd === 'C') {
        mkControlPoint(point.x1, point.y1, pointId, 'rect', 1);
    }

    if (point.cmd === 'C') {
        mkControlPoint(point.x2, point.y2, pointId, 'rect', 2);
    }
}

function remLastPoint(cmd) {
    circleCPs[circleCPs.length - 1].remove();
    if (cmd === 'Q' || cmd === 'C') rectCPs[rectCPs.length - 1].remove();
    if (cmd === 'C') rectCPs[rectCPs.length - 1].remove();
}
// TODO: should rem a single point incl cps, but rn duz so for every cp
function remPoints() {
    // TODO: to ensure there's no mem leak the eventListeners (onmouseenter, onmouseleave, onmousedown, onmouseup) might need to be explicitly removed...its easy to do, but maybe unnecesary, so set it up and compare perf
    [...circleCPs, ...rectCPs].forEach(c => c.remove());
}

// NOTE: since fill and stroke are computed, we need this parser in order to use configElement
function parseLayerStyle(conf = drawing.layers[session.layer].style) {
    return {
        'fill-rule': conf.fillRule,
        fill: conf.fill
            ? `rgba(${hexToRGB(conf.fillColor)}, ${conf.fillOpacity})`
            : 'transparent',
        stroke: `rgba(${[hexToRGB(conf.strokeColor), conf.strokeOpacity].join(',')})`,
        'stroke-width': conf.strokeWidth
    };
}

// changes style attrs of a layer
function styleLayer(layerId = session.layer, conf = drawing.layers[layerId].style) {
    const attrs = parseLayerStyle(conf);

    configElement(layers[layerId], attrs);
    save();
}

// changes attrs of a layer
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
    } // TODO: rect

    configElement(layers[layerId], attrs);
    save();
}

// draws and styles a layer
function draw(layerId = session.layer, layer = drawing.layers[layerId]) {
    styleLayer(layerId);
    drawLayer(layerId, layer);
}

function save() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}

// outputs the entire markup
function generateMarkUp() {
    output.textContent = `
    <svg width="${drawing.dims.width}" height="${drawing.dims.height}">
    ${group.innerHTML}
    </svg>`;
}

window.onload = () => { // TODO: onDOMContentloaded?
    // if there's a saved drawing, use it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing'));
    drawing.dims = src ? src.dims : Object.assign({}, defaultConfig.dims);
    drawing.layers = src ? src.layers : [];

    // initialize mode to that of the first layer or the default
    // NOTE: not done on top to prevent it becoming de-synced when refreshing
    session.mode = (drawing.layers[0] && drawing.layers[0].mode)
        ? drawing.layers[0].mode
        : 'path';

    // initialize session.layer, if there're layers
    if (drawing.layers.length) session.layer = 0;

    // create layers incl selectors and config ea layer
    drawing.layers.forEach((layer, i) => {
        const attrs = { 'data-layer-id': i };
        let shape;

        // TODO: get dryer
        // TODO: addLayerBtn.click();...that pushes to drawing.layers...split functionality to be able to reuse adding
        if (layer.mode === 'path') {
            // collect attrs of path representing the layer
            Object.assign(attrs, {
                d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '')
            }, parseLayerStyle(layer.style));
            // create shape and apply attrs (selector is created in mutation observer on surrounding group)
            shape = cloneFromTemplate(pathTemplate)(attrs);
        } else if (layer.mode === 'ellipse') {
            Object.assign(attrs,
                layer.points[0] || {},
                parseLayerStyle(layer.style));
            shape = cloneFromTemplate(ellipseTemplate)(attrs);
        } else if (layer.mode === 'rect') {
            Object.assign(attrs,
                layer.points[0] || {},
                parseLayerStyle(layer.style));
            shape = cloneFromTemplate(rectTemplate)(attrs);
        }

        // add shape to the html
        group.append(shape);
    });

    // create cps for active layer
    if (drawing.layers[session.layer]) {
        drawing.layers[session.layer].points.forEach(mkPoint);
        // fill and stroke
        adjustConfigItems();
    }

    // possibly change interfaces to configured values


    // dims
    widthSetter.value = drawing.dims.width;
    heightSetter.value = drawing.dims.height;
    setDimsOfSVG();
};

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
layerSelect.onchange = (e) => {
    if (e.target.type !== 'radio') return;

    // rem cps for current layer
    remPoints();

    session.layer = +e.target.value;
    session.mode = drawing.layers[session.layer].mode || session.mode || 'path';

    // mk cps for newly selected layer
    drawing.layers[session.layer].points.forEach(mkPoint);

    adjustConfigItems();
    styleLayer();
};

addLayerBtn.onclick = () => {
    // rem cps as we're implicitly switching layer
    remPoints();

    // create new vanilla layer and set session-focus to it
    // NOTE: push returns the new length of its caller
    session.layer = drawing
        .layers
        .push({
            mode: session.mode,
            points: [],
            style: Object.assign({}, defaultConfig.style) // FIXME: what if the user configs style before drawing?
        }) - 1;

    // create layer and selector
    const shape = cloneFromTemplate(svgTemplates[session.mode])({
        'data-layer-id': session.layer
    });
    group.append(shape);

    // adjust style configuration interfaces
    adjustConfigItems();
    save();
};

// deletes the active layer
delLayerBtn.onclick = () => {
    if (!layers.length) return;

    // rem cps
    remPoints();

    // remove layer data, layer and selector
    drawing.layers.splice(session.layer, 1);
    layers[session.layer].remove();

    // commit the change
    save();

    // TODO: set mode

    // adapt the Fill & Stroke fieldset to the style of the active layer
    if (drawing.layers[session.layer] && drawing.layers[session.layer].style) {
        // create cps
        drawing.layers[session.layer].points.forEach(mkPoint);
        adjustConfigItems();
    } else {
        adjustConfigItems(defaultConfig.style);
    }
};

clearAllBtn.onclick = () => {
    // reset data
    drawing.layers.length = 0;
    drawing.dims = Object.assign({}, defaultConfig.dims);

    // commit the changes
    window.localStorage.removeItem('drawing');

    // TODO: reset mode?

    // reset command to M
    session.cmd = 'M';

    // rem CPs
    remPoints();

    // remove all layers incl selectors
    [...layers].forEach(layer => layer.remove());

    adjustConfigItems(defaultConfig.style);
    generateMarkUp();
};

undoBtn.onclick = () => {
    if (drawing.layers[session.layer].points.length) {
        remLastPoint(drawing.layers[session.layer].points.pop().cmd);
        drawLayer();
    }
};

// Canvas
svg.addEventListener('mousedown', (e) => {
    if (!layers.length) {
        addLayerBtn.click();
    }

    const [x, y] = getMousePos(svg, e);
    const layer = drawing.layers[session.layer];

    if (session.drawingRect) {
        session.drawingRect = false;
        svg.onmousemove = '';

        layer.points[0] = {
            width: Math.abs(session.rectStart.x - x),
            height: Math.abs(session.rectStart.y - y)
        };
    } else if (session.mode === 'rect') {
        if (layer.points.length) return;

        const rect = layers[session.layer];

        layer.points[0] = {
            x,
            y
        };

        configElement(rect, layer.points[0]);

        session.drawingRect = true;
        [session.rectStart.x, session.rectStart.y] = [x, y];

        svg.onmousemove = (ev) => {
            // TODO: allow stopping rect-creation by pressing esc?
            // FIXME: when moving second point left/top over 1st, the control should switch and we be controlling the 1st
            const [x1, y1] = getMousePos(svg, ev);

            configElement(rect, {
                width: Math.abs(x - x1),
                height: Math.abs(y - y1)
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
            remLastPoint(session.cmd);
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
    } else if (session.mode === 'ellipse') {
        if (layer.points[0]) return;
        // TODO: enable two part definition as w rects
        // here only store cx and cy and on 2nd click calculate rx and ry based on difference

        layer.points.push({
            cx: x,
            cy: y,
            rx: 50,
            ry: 50
        });

        //mkPoint(layer.points[0], 1);
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
[...cmdSelect].forEach((cmd) => {
    cmd.onchange = () => {
        session.cmd = cmds[cmds.indexOf(cmd.value)] || cmds[0];
    };
});

// TODO: proxy or sth? would need to be on drawing and defined in onload.
// we want to keep svg.style.dims, drawing.dims and the two responsible number inputs in sync
function setDimsOfSVG() {
    svg.style.width = `${drawing.dims.width}px`;
    svg.style.height = `${drawing.dims.height}px`;
}

// Dimensions of canvas
dims.onchange = ({ target }) => {
    drawing.dims[target.id] = target.value
        || drawing.dims[target.id]
        || defaultConfig.dims[target.id]
        || 0;
    svg.style[target.id] = `${drawing.dims[target.id]}px`;
    save();
};

// Modes
[...modeSelector].forEach((mode) => {
    mode.onchange = () => {
        session.mode = modes.includes(mode.value) ? mode.value : session.mode;

        // if we change the mode, we add a new layer and start editing that in the set mode
        // NOTE: we only want that behavior when the current layer is not empty
        if (layers[session.layer]) {
            addLayerBtn.click();
        }
    };
});

// TODO: listening to changes to the fieldset might simplify this a bit
// Fill & Stroke
[
    strokeColorSetter,
    strokeOpacitySetter,
    strokeWidthSetter,
    fillColorSetter,
    fillOpacitySetter,
    fillRuleSetter
].forEach((el) => {
    el.onchange = (e) => {
        drawing.layers[session.layer].style[e.target.name] = e.target.value;
        styleLayer();
    };
});
[fillToggle, closeToggle].forEach((el) => {
    el.onchange = (e) => {
        drawing.layers[session.layer].style[e.target.name] = e.target.checked;
        draw(); // NOTE: fillToggle needs styleLayer and genMK; closeToggle setDOfLayer and genMK...
        generateMarkUp();
    };
});

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

output.ondblclick = () => {
    const range = document.createRange();

    range.selectNodeContents(output);
    window.getSelection().addRange(range);
    document.execCommand('copy');
};