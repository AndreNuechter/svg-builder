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

// TODO: quite a few of the elements/nodeLists are only referenced once, so dont need to clutter up the top

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
const modes = ['path', 'arc', 'rect'];

// SVG
const ns = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('outer-container');
const group = document.getElementById('inner-container');
const overlay = document.getElementById('overlay');
const paths = group.getElementsByTagName('path');
const circleCPs = document.getElementsByTagName('circle');
const rectCPs = document.getElementsByTagName('rect');

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
const cmds = ['M', 'L', 'Q', 'C'];

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

// initialize session
const session = new Proxy({
    cmd: 'M',
    layer: 0,
    mode: 'rect',
    drawingRect: false,
    rectStart: {}
}, {
    set(obj, key, val) {
        if (key === 'mode' && modes.includes(val)) {
            document.querySelector(`input[type="radio"][value="${val}"]`).checked = true;
            commands.style.display = val === 'path' ? 'initial' : 'none';
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
const pathTemplate = document.createElementNS(ns, 'path');
const rectTemplate = document.createElementNS(ns, 'rect');
const circleTemplate = document.createElementNS(ns, 'circle');

const groupObserver = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
            if (mutation.addedNodes.length) {
                if (mutation.addedNodes[0].nodeName === 'path') {
                    const label = cloneFromTemplate(labelTemplate)({
                        textContent: `Layer ${layerSelect.childElementCount + 1}`
                    });
                    const selector = cloneFromTemplate(selectorTemplate)({
                        value: layerSelect.childElementCount,
                        checked: session.layer === layerSelectors.length
                    });

                    label.append(selector);
                    layerSelect.append(label);
                }
            }

            if (mutation.removedNodes.length) {
                if (mutation.removedNodes[0].nodeName === 'path') {
                    // TODO: rem layerSelect when path is removed...how to tell which ordinal the removed path had? add ordinal attr to path
                }
            }
        }
    });
});
groupObserver.observe(group, { childList: true, attributes: true });

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

// constructs a draggable point to control some prop(s) of the active layer
// NOTE: types are [0: point, 1: cp1, 2: cp2], since quadratic or cubic curves have 1 or 2 cps (this func is called trice for a cubic curve, excluding the first moveTo)
function mkControlPoint(x, y, pointId, shapeName, type = 0) {
    if (!Object.keys(getShape).includes(shapeName)) return;

    const layerId = session.layer;
    const cp = getShape[shapeName](x, y);

    cp.classList.add('node');
    // TODO: give class to cp denoting its type

    // determine the props of the cp is gonna change when moved via dragging
    // FIXME: the idea behind this seems insufficient; c type arg too...it's rather awkward
    // for circle/arc this may need to change just one prop like x-rotation
    // to keep rects right angled, the affected props must be on different points of layer rn
    let xKey;
    let yKey;
    if (type === 0) { // regular point
        [xKey, yKey] = ['x', 'y'];
    } else if (type === 1) { // cp1
        [xKey, yKey] = ['x1', 'y1'];
    } else { // cp2
        [xKey, yKey] = ['x2', 'y2'];
    }

    // const point = drawing[session.layer].points[pointId];

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
    mkControlPoint(point.x, point.y, pointId, 'circle');

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

    configElement(paths[layerId], attrs);
    save();
}

// changes d attr of a layer
function drawLayer(layerId = session.layer, layer = drawing.layers[layerId]) {
    const d = layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '');

    configElement(paths[layerId], { d });
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
    // if there's a saved drawing, fetch it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing'));
    drawing.dims = src ? src.dims : Object.assign({}, defaultConfig.dims);
    drawing.layers = src ? src.layers : [{
        style: Object.assign({}, defaultConfig.style),
        points: []
    }];

    // create layers and selectors, apply style and d to ea
    drawing.layers.forEach((layer) => {
        // collect attrs of path representing the layer
        const attrs = Object.assign({
            d: layer.points.map(pointToMarkup).join(' ') + (layer.style.close ? ' Z' : '')
        }, parseLayerStyle(layer.style));
        // create path and apply attrs (selector is created in mutation observer on surrounding group)
        const path = cloneFromTemplate(pathTemplate)(attrs);
        // add path to the html
        group.append(path);
    });

    // create cps for active layer
    drawing.layers[session.layer].points.forEach(mkPoint);

    // possibly change interfaces to configured values
    if (src) {
        // if 1st layer has a mode, select it
        if (drawing.layers[0].mode) {
            session.mode = drawing.layers[0].mode;
        }

        // fill and stroke
        adjustConfigItems();

        // dims
        widthSetter.value = drawing.dims.width;
        heightSetter.value = drawing.dims.height;
        setDimsOfSVG();
    }
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
    session.mode = drawing.layers[session.layer].mode || session.mode;

    // mk cps for newly selected layer
    drawing.layers[session.layer].points.forEach(mkPoint);

    adjustConfigItems();
    styleLayer();
};

addLayerBtn.onclick = () => {
    // rem cps as we're implicitly switching layer
    remPoints();

    // create path and selector
    group.append(pathTemplate.cloneNode(false));

    // create new vanilla layer and set session-focus to it
    session.layer = drawing
        .layers
        .push({ points: [], style: Object.assign({}, defaultConfig.style) }) - 1;

    // adjust style configuration interfaces
    adjustConfigItems();
    save();
};

// deletes the active layer or resets it, if only one left
delLayerBtn.onclick = () => {
    if (!paths.length) return;

    // rem cps
    remPoints();

    // NOTE: we dont want to remove a path thats only gonna be added again, so we just reset the first path, layer and config
    if (paths.length === 1) {
        // delete points data
        drawing.layers[0].points.length = 0;
        // clear path markup
        paths[0].setAttribute('d', '');
        // reset the style data
        drawing.layers[0].style = Object.assign({}, defaultConfig.style);
        // apply style to path
        styleLayer();
        // apply style to interface
        adjustConfigItems();
        return;
    }

    // remove layer data, path and selector
    drawing.layers.splice(session.layer, 1);
    paths[session.layer].remove();
    layerSelect.children[session.layer].remove();

    // commit the change
    save();

    // if it was the final path, we set focus to new last item
    if (session.layer === paths.length) session.layer -= 1;
    else { // if it wasnt the last path, we have to re-configure subsequent selectors
        for (let i = session.layer; i < layerSelect.children.length; i += 1) {
            const selectorParts = [...layerSelect.children[i].childNodes];
            selectorParts[0].data = `Layer ${i + 1}`;
            selectorParts[1].value = i;
        }
    }

    // check the active layer in the selectors
    layerSelectors[session.layer].checked = true;

    // possibly change session.mode to that of the active layer
    session.mode = drawing.layers[session.layer].mode || session.mode;

    // adapt the Fill & Stroke fieldset to the style of the active layer
    adjustConfigItems();

    // create cps
    drawing.layers[session.layer].points.forEach(mkPoint);
};

clearAllBtn.onclick = () => {
    // rem CPs
    remPoints();

    // remove all paths incl selectors excl 1st
    [...paths].forEach((path, i) => {
        if (i > 0) {
            path.remove();
            layerSelect.children[1].remove();
        }
    });

    // clear markup of 1st path
    paths[0].setAttribute('d', '');

    // check 1st selector
    layerSelectors[0].checked = true;

    // reset layer data
    drawing.layers.length = 1;
    drawing.layers[0] = { style: Object.assign({}, defaultConfig.style), points: [] };
    drawing.dims = Object.assign({}, defaultConfig.dims);

    // commit the changes
    window.localStorage.removeItem('drawing');

    // reset command to M
    session.cmd = 'M';

    // reset active layer
    session.layer = 0;

    adjustConfigItems();
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
    const [x, y] = getMousePos(svg, e);
    const layer = drawing.layers[session.layer];

    if (session.drawingRect) {
        session.drawingRect = false;
        svg.onmousemove = '';

        layer.mode = session.mode;
        layer.points.push({
            cmd: 'M',
            x: session.rectStart.x,
            y: session.rectStart.y
        }, {
            cmd: 'L',
            x,
            y: session.rectStart.y
        }, {
            cmd: 'L',
            x,
            y
        }, {
            cmd: 'L',
            x: session.rectStart.x,
            y
        });

        mkPoint(layer.points[0], 0);
        mkPoint({ x: layer.points[1].x, y: layer.points[2].y }, 3);
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

        // for M and L cmds, this is enuff
        layer.mode = session.mode;
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
        }

        // create a cp for the new point
        mkPoint(layer.points[layer.points.length - 1], layer.points.length - 1);
    } else if (session.mode === 'arc') {
        if (layer.points[0]) return;

        layer.mode = session.mode;
        // TODO: arc func
        // TODO: how to control props?
        // TODO: rethink defaults
        layer.points.push({
            cmd: 'M',
            x,
            y: y - 1
        }, {
            cmd: 'A',
            x,
            y,
            xR: 50,
            yR: 50,
            xRot: 0,
            large: 1,
            sweep: 1
        });

        mkPoint(layer.points[0], 1);
    } else if (session.mode === 'rect') {
        if (layer.points.length) return;

        const path = paths[session.layer];
        const start = `M ${[x, y].join(' ')}`;

        session.drawingRect = true;
        [session.rectStart.x, session.rectStart.y] = [x, y];

        svg.onmousemove = (ev) => {
            // TODO: allow stopping rect-creation by pressing esc
            const [x1, y1] = getMousePos(svg, ev);

            path.setAttribute('d', `${start} H ${x1} V ${y1} H ${x} Z`);
        };
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

        // if we change the mode and the current layer is not blank, we add a new layer and start editing that in the set mode
        if (drawing.layers[session.layer].points.length) {
            addLayerBtn.click();
        }
    };
});

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