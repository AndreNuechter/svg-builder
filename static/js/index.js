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
    move,
    scale,
    rotate,
    reflect,
    trim
} from './transformations.js';

// Layers fieldset
const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer');
const addLayerBtn = document.getElementById('add-layer');
const delLayerBtn = document.getElementById('del-layer');
const clearAllBtn = document.getElementById('clear-all');
const undoBtn = document.getElementById('undo');

// Dimensions fieldset
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

// TODO: mov this to transformations.js
const inc = num => num + 1;
const dec = num => num - 1;
const moves = {
    ArrowUp: ['y', dec],
    ArrowDown: ['y', inc],
    ArrowLeft: ['x', dec],
    ArrowRight: ['x', inc]
};

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

const rectStart = {};

const session = new Proxy({}, {
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
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'layer';

    return input;
})();
const labelTemplate = document.createElement('label');
const groupObserver = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
            if (mutation.addedNodes.length) {
                if (mutation.addedNodes[0].nodeName === 'path') {
                    const label = labelTemplate.cloneNode(false);
                    label.textContent = `Layer ${layerSelect.childElementCount + 1}`;
                    const selector = label.appendChild(selectorTemplate.cloneNode(false));
                    selector.value = layerSelect.childElementCount;
                    selector.checked = (session.layer === layerSelectors.length);
                    layerSelect.append(label);
                }
            }

            if (mutation.removedNodes.length) {
                if (mutation.removedNodes[0].nodeName === 'path') {
                    // TODO: rem layerSelect when path is removed
                }
            }
        }
    });
});
groupObserver.observe(group, { childList: true, attributes: true });

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

const pathTemplate = document.createElementNS(ns, 'path');

// highlights segments affected by dragged cp
function hilightSegment(layer = drawing.layers[session.layer], pointId, cp) {
    const { points } = layer;

    if (points.length <= 1) return;

    let d;

    // what can we tell about the dragged point?
    if (pointId === points.length - 1 || cp) { // it's the last point or a cp
        d = `M ${[points[pointId - 1].x, points[pointId - 1].y].join(' ')}
         ${pointToMarkup2(points[pointId])}`; // mov to prev point and copy curr
    } else if (pointId === 0) { // first point
        d = `M ${[points[pointId].x, points[pointId].y].join(' ')}
         ${pointToMarkup2(points[pointId + 1])}`; // mov to point and copy next
    } else { // a point in between
        d = `M ${[points[pointId - 1].x, points[pointId - 1].y].join(' ')}
         ${pointToMarkup2(points[pointId])}
         ${pointToMarkup2(points[pointId + 1])}`; // mov to prev point and copy curr as well as next
    }

    overlay.setAttribute('stroke', 'orange'); // TODO: adapt to strokeColor...find complement? otherwise this could be done in pug...
    overlay.setAttribute('stroke-width', +drawing.layers[session.layer].style.strokeWidth + 4);
    overlay.setAttribute('d', d);
}

// TODO: why is association to layer transitive? (point controls other layer when switching, but pointId and layerId are captured?!)
// it throws when being on layer w cp, adding point (switches layer) and then moving the remaining cp
const dragging = (layerId, pointId, type, cp, xKey, yKey) => (e) => {
    // TODO: debounce?!
    const [x, y] = getMousePos(svg, e);

    // move the cp
    hilightSegment(drawing.layers[layerId], pointId, type > 0);
    if (type) { // TODO: stay dry...close over/capture changed attr? refactor definition of dragHandler
        cp.setAttribute('x', x);
        cp.setAttribute('y', y);
    } else {
        cp.setAttribute('cx', x);
        cp.setAttribute('cy', y);
    }

    // update the dragged point
    [
        drawing.layers[layerId].points[pointId][xKey],
        drawing.layers[layerId].points[pointId][yKey]
    ] = [x, y];
    setDOfLayer();
};
const stopDragging = () => {
    svg.onmousemove = '';
    svg.onmouseleave = '';
    svg.onmouseup = '';
    overlay.setAttribute('d', '');
};

function configElement(elementTemplate, attrs) {
    const element = elementTemplate.cloneNode(false);

    Object.keys(attrs).forEach((attr) => {
        element.setAttribute(attr, attrs[attr]);
    });

    return element;
}

const rectTemplate = document.createElementNS(ns, 'rect');
const circleTemplate = document.createElementNS(ns, 'circle');
const getShape = {
    // we use rects for cps and circles for regular points
    circle(x, y) {
        const attrs = {
            cx: x,
            cy: y,
            r: 3
        };
        return configElement(circleTemplate, attrs);
    },
    rect(x, y) {
        const attrs = {
            x,
            y,
            width: 5,
            height: 5
        };
        return configElement(rectTemplate, attrs);
    }
};

const hilightCP = e => e.target.classList.toggle('hovered'); // TODO: can this be done w css pseudo class?

// constructs a draggable point
function mkControlPoint(x, y, pointId, shapeName, type = 0) {
    if (!Object.keys(getShape).includes(shapeName)) return;

    // NOTE: types are [0: point, 1: cp1, 2: cp2], since quadratic or cubic curves have 1 or 2 cps (this func is called trice for a cubic curve, excluding the first moveTo)

    const cp = getShape[shapeName](x, y);

    cp.classList.add('node');

    // highlight dragable point on hover
    cp.onmouseenter = hilightCP;
    cp.onmouseleave = hilightCP;

    // determine the attribute the cp is gonna change when moved via dragging
    let xKey;
    let yKey;
    if (type === 0) { // regular point
        [xKey, yKey] = ['x', 'y'];
    } else if (type === 1) { // cp1
        [xKey, yKey] = ['x1', 'y1'];
    } else { // cp2
        [xKey, yKey] = ['x2', 'y2'];
    }

    // toggle dragging on mousedown
    cp.onmousedown = (e) => {
        // prevent triggering svg.mousedown
        e.stopPropagation();
        // so the hilight is shown prior to movement
        hilightSegment(drawing.layers[session.layer], pointId, type > 0);
        // update attr of dragged point on mousemove
        svg.onmousemove = dragging(session.layer, pointId, type, cp, xKey, yKey);
        svg.onmouseleave = stopDragging;
        svg.onmouseup = stopDragging;
    };

    // stop dragging on mouseup
    cp.onmouseup = stopDragging;

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

// TODO: rect
function remLastPoint(cmd) {
    circleCPs[circleCPs.length - 1].remove();
    if (cmd === 'Q' || cmd === 'C') rectCPs[rectCPs.length - 1].remove();
    if (cmd === 'C') rectCPs[rectCPs.length - 1].remove();
}
// TODO: should rem a single point incl cps, but rn duz so for every cp
function remPoint() {
    // TODO: to ensure there's no mem leak the eventListeners (onmouseenter, onmouseleave, onmousedown, onmouseup) might need to be explicitly removed...its easy to do, but maybe unnecesary, so set it up and compare perf
    [...circleCPs, ...rectCPs].forEach(c => c.remove());

    // TODO: there might be potential to optimize when we compare number of points between switched layers and only rem/mk the difference
}

// changes style attrs of a layer
function styleLayer(layerId = session.layer, conf = drawing.layers[layerId].style) {
    const path = paths[layerId];
    const args = [
        ['fill-rule', conf.fillRule],
        ['fill', conf.fill
            ? `rgba(${hexToRGB(conf.fillColor)}, ${conf.fillOpacity})`
            : 'transparent'
        ],
        ['stroke', `rgba(${[hexToRGB(conf.strokeColor), conf.strokeOpacity].join(',')})`],
        ['stroke-width', conf.strokeWidth]
    ];

    args.forEach(arg => path.setAttribute(...arg));

    save();
}

// changes d attr of a layer
function setDOfLayer(layerId = session.layer, layer = drawing.layers[layerId]) {
    const d = layer.points.map(pointToMarkup2).join(' ');
    paths[layerId]
        .setAttribute('d',
            d + (layer.style.close ? ' Z' : ''));

    save();
}

function save() {
    window.localStorage.setItem('drawing', JSON.stringify(drawing));
}

// draws a layer
function draw(layerId = session.layer, layer = drawing.layers[layerId]) {
    styleLayer(layerId);
    setDOfLayer(layerId, layer);
}

// outputs the entire markup
function generateMarkUp() {
    output.textContent = `
    <svg width="${drawing.dims.width}" height="${drawing.dims.height}">
    ${group.innerHTML}
    </svg>`; // TODO: rem cps and overlay; rem whitespace
}

// TODO: proxy or sth?
function setDimsOfSVG() {
    svg.style.width = `${drawing.dims.width}px`;
    svg.style.height = `${drawing.dims.height}px`;
}

// const camelToKebap = str => str
//     .split('')
//     .map(char => (char.charCodeAt(0) > 40 && char.charCodeAt(0) < 91
//         ? `-${char.toLowerCase()}`
//         : char))
//     .join('');

// function configElement(el, ...config) {
//     config.forEach((obj) => {
//         if (!['fill', 'close'].includes(obj[0])) {
//             el.setAttribute(obj[0], obj[1]);
//         }
//     });

//     return el;
// }

// function styleConfig(config) {
//     return Object.keys(config).map(key => [camelToKebap(key), config[key]]);
// }

function pointToMarkup2(point) {
    const args = [];

    /* eslint-disable */
    switch (point.cmd) {
        case 'M':
            args.push(point.x, point.y);
            break;
        case 'H':
            args.push(point.x);
            break;
        case 'V':
            args.push(point.y);
            break;
        case 'A':
            args.push(point.xR,
                point.yR,
                point.xRot,
                point.large,
                point.sweep,
                point.x,
                point.y);
            break;
        case 'L':
            args.push(point.x,
                point.y);
            break;
        case 'Q':
            args.push(point.x,
                point.y,
                point.x1,
                point.y1);
            break;
        case 'C':
            args.push(point.x,
                point.y,
                point.x1,
                point.y1,
                point.x2,
                point.y2);
            break;
        default:
            throw Error('WTF!');
    }
    /* eslint-enable */

    return [point.cmd, ...args].join(' ');
}

window.onload = () => { // TODO: onDOMContentloaded?
    // if there's a saved drawing, fetch it, else use defaults
    const src = JSON.parse(window.localStorage.getItem('drawing'));
    drawing.dims = src ? src.dims : Object.assign({}, defaultConfig.dims);
    drawing.layers = src ? src.layers : [{
        style: Object.assign({}, defaultConfig.style),
        points: []
    }];

    // initialize session
    session.cmd = 'M';
    session.layer = 0;
    session.mode = 'rect';
    session.drawingRect = false;

    // create layers and selectors, apply style and d to ea
    drawing.layers.forEach((layer, i) => {
        // create additional layer and selector (selectors are created in mutation observer)
        const path = pathTemplate.cloneNode(false);
        // apply config
        // TODO: do this before appending
        // configElement(path,
        //     ['d', layer.points.map(pointToMarkup2).join(' ') + (layer.style.close ? ' Z' : '')],
        //     ...styleConfig(layer.style));
        // add to the html
        group.append(path);
        styleLayer(i);
        setDOfLayer(i);
    });

    // create cps for active layer
    drawing.layers[session.layer].points.forEach(mkPoint);

    // initially check first layer selector
    // FIXME: layerSelector[0] is undefined here but should contain at least one item!
    // layerSelectors[0].checked = true;

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
        move(moves[key], drawing.layers[session.layer].points);
        setDOfLayer();
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
    // TODO: the func should be called in a loop dealing w ea individual cp
    remPoint();

    session.layer = +e.target.value;
    session.mode = drawing.layers[session.layer].mode || session.mode;

    // mk cps for newly selected layer
    drawing.layers[session.layer].points.forEach(mkPoint);

    adjustConfigItems();
    styleLayer();
    generateMarkUp();
};

addLayerBtn.onclick = () => {
    // rem cps as we're implicitly switching layer
    // TODO: better trigger layerSelect.onchange?
    remPoint();

    // create new default layer and set focus to new path
    session.layer = drawing
        .layers
        .push({ points: [], style: Object.assign({}, defaultConfig.style) }) - 1;

    drawing.layers.push({ points: [], style: Object.assign({}, defaultConfig.style) });

    // create path and selector
    group.append(pathTemplate.cloneNode(false));
    // TODO: check it

    // adjust config configuration interface
    adjustConfigItems();
    save();
};

// deletes the active layer or resets it, if only one left
delLayerBtn.onclick = () => {
    if (!paths.length) return;

    // rem cps
    remPoint();

    // NOTE: we dont want to remove a path thats only gonna be added again, so we just reset the first path, layer and config
    if (paths.length === 1) {
        paths[0].setAttribute('d', '');
        drawing.layers[0].points.length = 0;
        drawing.layers[0].style = Object.assign({}, defaultConfig.style);
        adjustConfigItems();
        styleLayer();
        generateMarkUp();
        return;
    }

    // remove path, selector and data of layer
    paths[session.layer].remove();
    layerSelect.children[session.layer].remove();
    drawing.layers.splice(session.layer, 1);

    // commit the change
    //save();
    window.localStorage.removeItem('drawing');

    // if it was the final path, we set focus to new last item
    if (session.layer === paths.length) session.layer -= 1;
    else { // if it wasnt the last path, we have to reorder the path selectors
        // TODO: not sure if a loop is needed here
        for (let i = session.layer; i < layerSelect.children.length; i += 1) {
            // create and configure the selector
            const selector = layerSelectors[0].cloneNode(false);
            selector.value = i + 1;
            selector.checked = false;
            // add text label to current layer selector container
            // FIXME: this implicitly overwrites innerHTML...if the label wouldnt enclose the input we could just change the text and the value
            layerSelect.children[i].textContent = `Layer ${i + 1}`;
            // add configured layer selector
            layerSelect.children[i].append(selector);
        }
    }

    // check active layer selector
    // TODO: do this in adjustConfigItems?
    layerSelect.children[session.layer].children[0].checked = true;

    adjustConfigItems();

    // create cps
    drawing.layers[session.layer].points.forEach(mkPoint);
    //mkCps(drawing.layers[session.layer].mode, drawing.layers[session.layer].points);
};

clearAllBtn.onclick = () => {
    // rem CPs
    remPoint();

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
    save();

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
        setDOfLayer();
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
            x: rectStart.x,
            y: rectStart.y
        }, {
            cmd: 'L',
            x,
            y: rectStart.y
        }, {
            cmd: 'L',
            x,
            y
        }, {
            cmd: 'L',
            x: rectStart.x,
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
        if (layer.length === 0) {
            session.cmd = 'M';
        }

        // ensure there're no multiple consecutive moveTo commands
        if (lastPoint && lastPoint.cmd === 'M' && session.cmd === 'M') {
            layer.points.pop();
            remLastPoint(session.cmd);
        }

        layer.mode = session.mode;
        layer.points.push({
            cmd: session.cmd,
            x,
            y
        });

        // add cps
        if (session.cmd === 'Q') {
            const cp = quad([x, y], layer.points[layer.points.length - 2]);

            layer.points[layer.points.length - 1].x1 = cp.x;
            layer.points[layer.points.length - 1].y1 = cp.y;
        } else if (session.cmd === 'C') {
            const [cp1, cp2] = cube([x, y], layer.points[layer.points.length - 2]);

            // TODO: cant we use destructuring here?
            layer.points[layer.points.length - 1].x1 = cp1.x;
            layer.points[layer.points.length - 1].y1 = cp1.y;
            layer.points[layer.points.length - 1].x2 = cp2.x;
            layer.points[layer.points.length - 1].y2 = cp2.y;
        }

        mkPoint(layer.points[layer.points.length - 1], layer.points.length - 1);
    } else if (session.mode === 'arc') {
        if (layer.points[0]) return;

        layer.mode = session.mode;
        // TODO: arc func
        // NOTE: args in order: x-radius in px, y-radius in px, x-rotation in deg, large-arc bool, sweep bool, x- and y-coords
        // TODO: how to control those?
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
        if (layer.length) return;

        const path = paths[session.layer];
        const start = `M ${[x, y].join(' ')}`;

        session.drawingRect = true;
        [rectStart.x, rectStart.y] = [x, y];

        svg.onmousemove = (ev) => {
            // TODO: allow stopping rect-creation by pressing esc
            // TODO: make this wotk w setDOfLayer
            const [x1, y1] = getMousePos(svg, ev);
            const d = `${start} H ${x1} V ${y1} H ${x} Z`;
            path.setAttribute('d', d);
        };
    }

    styleLayer();
    setDOfLayer();
}, false);

svg.addEventListener('mousemove', coordToolTips);
svg.addEventListener('mouseover', coordToolTips);
svg.addEventListener('mouseleave', () => {
    [coords.style.top, coords.style.left] = ['-100px', '-100px'];
});

// Commands (only visible when in path mode)
[...cmdSelect].forEach((cmd) => {
    cmd.onchange = () => {
        session.cmd = cmds[cmds.indexOf(cmd.value)] || cmds[1];
    };
});

// Dimensions of canvas
const setDims = () => {
    drawing.dims.width = widthSetter.value || defaultConfig.dims.width;
    drawing.dims.height = heightSetter.value || defaultConfig.dims.height;
    setDimsOfSVG();
    save();
};
[widthSetter.onchange, heightSetter.onchange] = [setDims, setDims]; // TODO: if we attach the listener to a common parent, we can simplify this

// Modes
[...modeSelector].forEach((mode) => {
    mode.onchange = () => {
        session.mode = modes.includes(mode.value) ? mode.value : session.mode;

        // if we change the mode and the current layer is not blank, we add a new layer and start editing that in the set mode
        // TODO: if theres an empty layer, dont add one but set focus to that
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
        generateMarkUp();
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

    setDOfLayer();
};

output.ondblclick = () => {
    // TODO: copy to clipboard
    const range = document.createRange();

    range.selectNodeContents(output);
    window.getSelection().addRange(range);
};