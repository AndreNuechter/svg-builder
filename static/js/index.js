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

const layerSelect = document.getElementById('layer-select');
const layerSelectors = document.getElementsByName('layer');
const addLayerBtn = document.getElementById('add-layer');
const delLayerBtn = document.getElementById('del-layer');
const clearAllBtn = document.getElementById('clear-all');
const undoBtn = document.getElementById('undo');
const width = document.getElementById('width');
const height = document.getElementById('height');

const ns = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('target');
const overlay = document.getElementById('overlay');
const paths = svg.getElementsByTagName('path');
const circleCPs = document.getElementsByTagName('circle');
const rectCPs = document.getElementsByTagName('rect');
const coords = document.getElementById('coords');
const coordToolTips = (e) => {
    const [x, y] = getMousePos(svg, e);
    coords.textContent = `x: ${x}, y: ${y}`;
    coords.style.left = `${e.pageX + 16}px`;
    coords.style.top = `${e.pageY - 32}px`;
};
const output = document.getElementById('output');

const modeSelector = document.getElementsByName('modes');
const modes = ['path', 'arc', 'rect'];

const commands = document.getElementById('commands');
const cmdSelect = document.getElementsByName('command');
const cmds = ['M', 'L', 'Q', 'C'];

// NOTE: currLayer is the 1-based ordinal of the current layer, label/val of layerSelector and Id of corresponding layer/config object
// id in paths[] and layerSelector is (currLayer - 1)
let currLayer = 1;

const session = new Proxy({
    cmd: 'M',
    layer: 0,
    mode: 'rect',
    drawingRect: false
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

        // TODO: layer and drawingRect

        return false;
    }
});

const labelTemplate = document.createElement('label');
const svgObserver = new MutationObserver((mutationsList, observer) => {
    // TODO: define logic to highlight only first point in path
    // TODO: collect mutations svg can experience and what effects those should have
    // adding/removing a path --> adding/removing layerSelector; adding/removing layer and config objs
    // changing attrs (width and height) --> update config and concerned inputs

    mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
            if (mutation.addedNodes.length) {
                if (mutation.addedNodes[0].nodeName === 'circle') {
                    // TODO: define logic to highlight first point in path
                } else if (mutation.addedNodes[0].nodeName === 'rect') {
                    // TODO: define logic to highlight first point in path
                } else if (mutation.addedNodes[0].nodeName === 'path') {
                    const label = labelTemplate.cloneNode(false);
                    label.textContent = `Layer ${layerSelect.childElementCount + 1}`;
                    const selector = label.appendChild(layerSelectors[0].cloneNode(false));
                    selector.value = layerSelect.childElementCount + 1;
                    selector.checked = true;
                    layerSelect.append(label);
                }
            }

            if (mutation.removedNodes.length) {
                if (mutation.removedNodes[0].nodeName === 'circle') {
                    // TODO: define logic to highlight first point in path
                } else if (mutation.removedNodes[0].nodeName === 'rect') {
                    // TODO: define logic to highlight first point in path
                } else if (mutation.removedNodes[0].nodeName === 'path') {
                    // TODO: rem layerSelect when path is removed
                }
            }
        }
    });
});
svgObserver.observe(svg, { childList: true, attributes: true });

const strokeColorSetter = document.getElementById('stroke-color');
const strokeOpacitySetter = document.getElementById('stroke-opacity');
const fillColorSetter = document.getElementById('fill-color');
const fillOpacitySetter = document.getElementById('fill-opacity');
const strokeWidthSetter = document.getElementById('stroke-width');
const fillRuleSetter = document.getElementById('fill-rule');
const fillChk = document.getElementById('fill');
const closeChk = document.getElementById('close');
const scalingFactor = document.getElementById('scaling-factor');
const deg = document.getElementById('deg');
const reflection = document.getElementById('reflect');
const trimChk = document.getElementById('trim-check');
const transformBtn = document.getElementById('transform');
const inc = num => num + 1;
const dec = num => num - 1;
const moves = {
    ArrowUp: ['y', dec],
    ArrowDown: ['y', inc],
    ArrowLeft: ['x', dec],
    ArrowRight: ['x', inc]
};

// TODO: why do we have two arrs by default? that currLayer works as described? becuase we didnt kknow where to store dims?... use first item to store modes?
let layers = window.localStorage.getItem('layers')
    ? window.localStorage.getItem('layers').split(';').map(p => JSON.parse(p))
    : [
        [],
        []
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
        fillChk: false, // TODO: bad names
        closeChk: true // TODO: bad names
    }
};
let config = window.localStorage.getItem('config')
    ? window.localStorage.getItem('config').split(';').map(c => JSON.parse(c))
    : [
        Object.assign({}, defaultConfig.dims),
        Object.assign({}, defaultConfig.style)
    ];

const rectStart = {};
let drawingRect = false;

// adjusts the interface elements to a config
function adjustConfigItems(conf = config[currLayer]) {
    strokeColorSetter.value = conf.strokeColor;
    strokeOpacitySetter.value = conf.strokeOpacity;
    fillColorSetter.value = conf.fillColor;
    fillOpacitySetter.value = conf.fillOpacity;
    strokeWidthSetter.value = conf.strokeWidth;
    [...fillRuleSetter.children].forEach((child) => {
        child.selected = (child.value === conf.fillRule);
    });
    fillChk.checked = conf.fillChk;
    closeChk.checked = conf.closeChk;
}

const pathTemplate = document.createElementNS(ns, 'path');

// adds a new layer/path and a corresponding selector
function mkLayerAndSelector(layerId, checked) {
    // const label = labelTemplate.cloneNode(false);
    // label.textContent = `Layer ${layerId}`;
    // const selector = label.appendChild(layerSelectors[0].cloneNode(false));
    // selector.value = layerId;
    // selector.checked = checked;
    // layerSelect.append(label);

    svg.insertBefore(
        pathTemplate.cloneNode(false),
        paths[paths.length - 1] // we add the new path just before the overlay for move visualization
    );
}

// highlights segments affected by dragged cp
function hilightSegment(layer, pointId, cp) {
    if (layer.length <= 1) return;

    let d;

    // what can we tell about the dragged point?
    if (pointId === layer.length - 1 || cp) { // it's the last point or a cp
        d = `M ${[layer[pointId - 1].x, layer[pointId - 1].y].join(' ')}
         ${pointToMarkup(layer[pointId])}`; // mov to prev point and copy curr
    } else if (pointId === 0) { // first point
        d = `M ${[layer[pointId].x, layer[pointId].y].join(' ')}
         ${pointToMarkup(layer[pointId + 1])}`; // mov to point and copy next
    } else { // a point in between
        d = `M ${[layer[pointId - 1].x, layer[pointId - 1].y].join(' ')}
         ${pointToMarkup(layer[pointId])}
         ${pointToMarkup(layer[pointId + 1])}`; // mov to prev point and copy curr as well as next
    }

    overlay.setAttribute('stroke', 'orange'); // TODO: adapt to strokeColor...find complement? otherwise this could be done in pug...
    overlay.setAttribute('stroke-width', +config[currLayer].strokeWidth + 4);
    overlay.setAttribute('d', d);
}

const rectTemplate = document.createElementNS(ns, 'rect');
const circleTemplate = document.createElementNS(ns, 'circle');
const hilightCP = e => e.target.classList.toggle('hovered');
// TODO: why is association to layer transitive? (point controls other layer when switching, but pointId and layerId are captured?!)
// it throws when being on layer w cp, adding point (switches layer) and then moving the remaining cp
const dragging = (layerId, pointId, type, shape, xKey, yKey) => (e) => {
    // TODO: debounce?!
    const [x, y] = getMousePos(svg, e);

    // move the cp
    hilightSegment(layers[layerId], pointId, type > 0);
    if (type) { // TODO: stay dry...close over/capture changed attr? refactor definition of dragHandler
        shape.setAttribute('x', x);
        shape.setAttribute('y', y);
    } else {
        shape.setAttribute('cx', x);
        shape.setAttribute('cy', y);
    }
    // update the dragged point
    [layers[layerId][pointId][xKey], layers[layerId][pointId][yKey]] = [x, y];
    setDOfLayer();
};
const stopDragging = () => {
    svg.onmousemove = '';
    svg.onmouseleave = '';
    svg.onmouseup = '';
    overlay.setAttribute('d', '');
};

// constructs a draggable point
function mkControlPoint(x, y, pointId, type = 0) {
    // NOTE: types are [0: point, 1: cp1, 2: cp2], since quadratic or cubic curves have 1 or 2 cps (this func is called trice for a cubic curve, excluding the first moveTo)

    // we use rects for cps and circles for regular points
    const shape = type
        ? rectTemplate.cloneNode(false)
        : circleTemplate.cloneNode(false);
    shape.classList.add('node');

    if (type) {
        shape.setAttribute('x', x);
        shape.setAttribute('y', y);
        shape.setAttribute('width', 5);
        shape.setAttribute('height', 5);
    } else {
        shape.setAttribute('cx', x);
        shape.setAttribute('cy', y);
        shape.setAttribute('r', 3);
    }

    // highlight current position in shape
    // TODO: once red, always red...
    // we could just set all circles and rects to orange before this, but thats kinda cheap...mutation observer?
    if (pointId === layers[currLayer].length - 1) {
        shape.style.fill = 'red';
        shape.style.stroke = 'red';
    }

    // highlight dragable point on hover
    shape.onmouseenter = hilightCP;
    shape.onmouseleave = hilightCP;

    // determine the attribute shape is gonna change when moved via dragging
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
    shape.onmousedown = (e) => {
        // prevent triggering svg.mousedown
        e.stopPropagation();
        // so the hilight is shown prior to movement
        hilightSegment(layers[currLayer], pointId, type > 0);
        // update attr of dragged point on mousemove
        svg.onmousemove = dragging(currLayer, pointId, type, shape, xKey, yKey);
        svg.onmouseleave = stopDragging;
        svg.onmouseup = stopDragging;
    };

    // stop dragging on mouseup
    shape.onmouseup = stopDragging;

    svg.append(shape);
}

function mkPoint(point, pointId) {
    // draw a point incl cps
    mkControlPoint(point.x, point.y, pointId);

    if (point.cmd === 'Q' || point.cmd === 'C' || point.mode === 'rect') {
        mkControlPoint(point.x1, point.y1, pointId, 1);
    }

    if (point.cmd === 'C') {
        mkControlPoint(point.x2, point.y2, pointId, 2);
    }
}

// TODO: properly check for rect (rn I set cmd of rects to 'C' to make this work)
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
function styleLayer(layerId = currLayer) {
    const path = paths[layerId - 1];

    path.setAttribute('fill-rule', config[layerId].fillRule);
    path.setAttribute('fill', config[layerId].fillChk
        ? `rgba(${[
            hexToRGB(config[layerId].fillColor),
            config[layerId].fillOpacity
        ].join(',')})`
        : 'transparent');
    path
        .setAttribute('stroke', `rgba(${[
            hexToRGB(config[layerId].strokeColor),
            config[layerId].strokeOpacity
        ].join(',')})`);
    path.setAttribute('stroke-width', config[layerId].strokeWidth);

    saveConfigs();
}

// changes d attr of a layer
function setDOfLayer(layer = layers[currLayer], layerId = currLayer) {
    const path = paths[layerId - 1];
    let d;

    if (layer[0] && layer[0].mode === 'rect') {
        // TODO: pointToMarkup...
        d = `
        M ${[layer[0].x, layer[0].y].join(' ')} 
        H ${layer[0].x1} 
        V ${layer[0].y1} 
        H ${layer[0].x} 
        ${config[layerId].closeChk ? ' Z' : ''}`;
    } else if (layer[0] && layer[0].mode === 'arc') {
        // TODO: pointToMarkup
        d = `
        M ${[layer[0].x, layer[0].y].join(' ')} 
        A
        ${[layer[0].xR,
        layer[0].yR,
        layer[0].xRot,
        layer[0].large,
        layer[0].sweep,
        layer[0].x,
        layer[0].y - 1].join(' ')}
        ${config[layerId].closeChk ? ' Z' : ''}`;
    } else {
        d = layer
            .map(pointToMarkup)
            .join(' ')
            + (config[layerId].closeChk ? ' Z' : '');
    }

    path.setAttribute('d', d);

    saveLayers();
}

function saveConfigs() {
    window.localStorage.setItem('config', config.map(c => JSON.stringify(c)).join(';'));
}

// TODO: stay dry
function saveLayers() {
    window.localStorage.setItem('layers', layers.map(p => JSON.stringify(p)).join(';'));
}

// draws a layer
function draw(layer = layers[currLayer], layerId = currLayer) {
    styleLayer(layerId);
    setDOfLayer(layer, layerId);
}

// outputs the entire markup
function generateMarkUp() {
    output.textContent = svg.outerHTML; // TODO: rem cps and overlay; rem whitespace
}

// TODO: proxy or sth?
function setDimsOfSVG() {
    svg.style.width = `${config[0].width}px`;
    svg.style.height = `${config[0].height}px`;
}

window.onload = () => {
    // initially check first layer selector
    layerSelectors[0].checked = true;

    // create additional layers and selectors
    if (layers.length > 2) {
        for (let i = 2; i < layers.length; i += 1) {
            mkLayerAndSelector(i, false);
        }
    }

    // if first layer has at least one point, select the mode thereof
    if (layers[currLayer][0]) {
        session.mode = layers[currLayer][0].mode;
    }

    // possibly change interfaces to configured values
    if (window.localStorage.getItem('config')) {
        // fill, stroke and mode
        adjustConfigItems();

        // dims
        width.value = config[0].width;
        height.value = config[0].height;
        setDimsOfSVG();
    }

    // draw layers
    layers.slice(1).forEach((layer, id) => draw(layer, id + 1));

    generateMarkUp();

    // add cps to active layer
    layers[currLayer].forEach(mkPoint);
};

window.onkeydown = (e) => {
    const { key } = e;

    if (moves[key]) {
        e.preventDefault();
        move(moves[key], layers[currLayer]);
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

    currLayer = +e.target.value;
    session.mode = layers[currLayer][0] ? layers[currLayer][0].mode : session.mode;

    // mk cps for newly selected layer
    layers[currLayer].forEach(mkPoint);

    adjustConfigItems();
    styleLayer();
    generateMarkUp();
};

addLayerBtn.onclick = () => {
    // rem cps as we're implicitly switching layer
    // TODO: better trigger layerSelect.onchange?
    remPoint();

    // create path and selector
    mkLayerAndSelector(paths.length, true);

    // set focus to new path
    // TODO: this might be settable to the return from layers.push()
    currLayer = paths.length - 1;

    // create new points array
    layers.push([]);

    // set config for new path to default
    config.push(Object.assign({}, defaultConfig.style));

    // adjust config configuration interface
    adjustConfigItems();
    saveConfigs();
    saveLayers();
};

// deletes the active layer or resets it, if only one left
delLayerBtn.onclick = () => {
    // rem cps
    remPoint();

    // NOTE: the last path is the overlay and shouldn't be removed
    // further we dont want to remove a path thats only gonna be added again, so we just reset the first path, layer and config
    if (paths.length === 2) {
        paths[0].setAttribute('d', '');
        layers[1].length = 0;
        config[1] = Object.assign({}, defaultConfig.style);
        adjustConfigItems();
        styleLayer();
        generateMarkUp();
        return;
    }

    // remove layers and config
    // TODO: func for that?
    layers.splice(currLayer, 1);
    config.splice(currLayer, 1);

    // save the objects
    saveConfigs();
    saveLayers();

    // remove path and selector
    // TODO: func for that?
    paths[currLayer - 1].remove();
    layerSelect.children[currLayer - 1].remove();

    // if it was the final path, we set focus to new last item
    if (currLayer === paths.length) currLayer -= 1;
    else { // if it wasnt the last path, we have to reorder the path selectors
        // TODO: not sure if a loop is needed here
        for (let i = currLayer - 1; i < layerSelect.children.length; i += 1) {
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
    layerSelect.children[currLayer - 1].children[0].checked = true;

    adjustConfigItems();
    generateMarkUp();
};

clearAllBtn.onclick = () => {
    // rem CPs
    remPoint();

    // remove all paths incl selectors, excl 1st path and the overlay
    [...paths].forEach((path, i) => {
        if (i > 0 && !path.id) {
            path.remove();
            layerSelect.children[1].remove();
        }
    });

    // clear markup of 1st path
    paths[0].setAttribute('d', '');

    // check 1st selector
    layerSelect.children[0].children[0].checked = true;

    // reset layers and config
    layers = [
        [],
        []
    ];
    config = [
        Object.assign({}, defaultConfig.dims),
        Object.assign({}, defaultConfig.style)
    ];

    // commit the changes
    saveConfigs();
    saveLayers();

    // reset command to M
    session.cmd = 'M';

    // reset currLayer
    currLayer = 1;

    adjustConfigItems();
    generateMarkUp();
};

undoBtn.onclick = () => {
    if (layers[currLayer].length) {
        remLastPoint(layers[currLayer].pop().cmd);
        setDOfLayer();
    }
};

// Canvas
svg.addEventListener('mousedown', (e) => {
    const [x, y] = getMousePos(svg, e);
    const layer = layers[currLayer];

    if (drawingRect) {
        drawingRect = false;
        svg.onmousemove = '';

        layer.push({
            cmd: 'Q', // TODO: str8 up hack to make removal of cp1 work
            x: rectStart.x,
            y: rectStart.y,
            x1: x,
            y1: y,
            mode: session.mode
        });

        mkPoint(layer[layer.length - 1], layer.length - 1);
    } else if (session.mode === 'path') {
        // check for implemented commands
        if (!cmds.includes(session.cmd)) return;

        // prevent pushing the same point multiple times in a row
        // TODO: is this still needed w cps?
        if (layer[layer.length - 1]
            && x === layer[layer.length - 1].x
            && y === layer[layer.length - 1].y) {
            return;
        }

        // ensure first point of a path is a moveTo command
        if (layer.length === 0) {
            session.cmd = 'M';
        }

        // ensure there're no multiple consecutive moveTo commands
        if (layer[layer.length - 1] && layer[layer.length - 1].cmd === 'M' && session.cmd === 'M') {
            layer.pop();
            remLastPoint(session.cmd);
        }

        layer.push({
            x,
            y,
            cmd: session.cmd,
            mode: session.mode
        });

        // add cps
        if (session.cmd === 'Q') {
            const cp = quad([x, y], layer[layer.length - 2]);

            layer[layer.length - 1].x1 = cp.x;
            layer[layer.length - 1].y1 = cp.y;
        } else if (session.cmd === 'C') {
            const [cp1, cp2] = cube([x, y], layer[layer.length - 2]);

            // TODO: cant we use destructuring here?
            layer[layer.length - 1].x1 = cp1.x;
            layer[layer.length - 1].y1 = cp1.y;
            layer[layer.length - 1].x2 = cp2.x;
            layer[layer.length - 1].y2 = cp2.y;
        }

        mkPoint(layer[layer.length - 1], layer.length - 1);
    } else if (session.mode === 'arc') {
        if (layer[0]) return;

        // TODO: arc func
        // NOTE: args in order: x-radius in px, y-radius in px, x-rotation in deg, large-arc bool, sweep bool, x- and y-coords
        // TODO: how to control those?
        // TODO: rethink defaults
        layer[0] = {
            x,
            y,
            xR: 50,
            yR: 50,
            xRot: 0,
            large: 1,
            sweep: 1,
            cmd: 'A',
            mode: session.mode
        };

        mkPoint(layer[layer.length - 1], layer.length - 1);
    } else if (session.mode === 'rect') {
        if (layer.length) return;

        const path = paths[currLayer - 1];
        const start = `M ${[x, y].join(' ')}`;

        drawingRect = true;
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
    config[0].width = width.value || defaultConfig.dims.width;
    config[0].height = height.value || defaultConfig.dims.height;
    setDimsOfSVG();
    saveConfigs();
};
[width.onchange, height.onchange] = [setDims, setDims]; // TODO: if we attach the listener to a common parent, we can simplify this

// Modes
[...modeSelector].forEach((mode) => {
    mode.onchange = () => {
        session.mode = modes.includes(mode.value) ? mode.value : session.mode;

        // if we change the mode and the current layer is not blank, we add a new layer and start editing that in the set mode
        // TODO: if theres an empty layer, dont add one but set focus to that
        if (layers[currLayer].length) {
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
        config[currLayer][e.target.name] = e.target.value;
        styleLayer();
        generateMarkUp();
    };
});
[fillChk, closeChk].forEach((el) => {
    el.onchange = (e) => {
        config[currLayer][e.target.name] = e.target.checked;
        draw(); // NOTE: fillChk needs styleLayer and genMK; closeChk setDOfLayer and genMK...
        generateMarkUp();
    };
});

// Transformations
transformBtn.onclick = () => {
    if (+scalingFactor.value !== 1) {
        scale(+scalingFactor.value, layers[currLayer]);
    }

    if (+deg.value !== 0) {
        rotate(+deg.value, layers[currLayer]);
    }

    if (reflection.selectedIndex) {
        reflect(reflection.children[reflection.selectedIndex].value, layers[currLayer]);
    }

    if (trimChk.checked) {
        trim(layers[currLayer], config[0], width, height);
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