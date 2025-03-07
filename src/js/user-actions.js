import {
    drawLayer,
    styleLayer,
} from './layers/layer-handling.js';
import {
    backgroundGridStepsize,
    complexTransforms,
    defaults,
} from './constants.js';
import {
    applyTransforms,
    configClone,
    getRelevantConfiguredStyles,
    getSVGCoords,
    last,
    lastId,
} from './helper-functions.js';
import { setTransformsConfig } from './form-handling.js';
import {
    canvas,
    downloadLink,
    dummyImg,
    svgTemplates,
} from './dom-creations.js';
import {
    controlPointContainer,
    svg,
    transformTargetSwitch,
} from './dom-selections.js';
import { mkControlPoints } from './control-points/control-point-handling.js';
import drawing, {
    redo,
    save,
} from './drawing/drawing.js';
import session from './session.js';
import layerTypes from './layers/layer-types.js';
import { addLayer } from './layers/layer-management.js';
import { generateDataURI, generateMarkUp, updateViewBox } from './drawing/drawing-output-config.js';
import { setActiveLayerConfig } from './layers/active-layer-config.js';

// TODO split this module up

const ctx = canvas.getContext('2d');
let dummyImageIsSetUp = false;

export {
    addPoint,
    centerRotation,
    changeBackgroundGridSize,
    configOutput,
    copyDataURIToClipboard,
    copyMarkupToClipboard,
    finalizeShape,
    redo,
    resetTransforms,
    setCenterOfRotation,
    setCmd,
    setFillOrStroke,
    setMode,
    setTransform,
    setTransformTarget,
    togglePathClosing,
    triggerDownload,
};

// TODO mv to drawing?
function addPoint(event) {
    if (!session.activeLayer) addLayer();

    const [x, y] = getSVGCoords(event);
    const { points } = session.activeLayer;

    layerTypes[session.mode]
        .mkPoint(
            session,
            points,
            x,
            y
        );

    // enable dragging the newly created path-point wo having to release the pointer
    if (session.mode === 'path') {
        controlPointContainer.lastElementChild.dispatchEvent(new Event('pointerdown'));
    }

    styleLayer(session.layerId);
    drawLayer(session.layerId);
}

function centerRotation() {
    const args = session.transformLayerNotDrawing
        ? [session.activeSVGElement, session.activeLayer.transforms]
        : [svg.firstElementChild, drawing.transforms];

    setCenterOfRotation(...args);
    applyTransforms(drawing, session);
}

function changeBackgroundGridSize({ deltaY }) {
    const currentValue = Number(
        document.documentElement.style.getPropertyValue('--bg-grid-size').replace('px', '') || 40,
    );
    // deltaY is negative when scrolling up
    const scalingDirection = deltaY < 0 ? -1 : 1;

    // acceptable range for gridsize is (x: 10 >= x <= 80)
    if ((scalingDirection === -1 && currentValue === 10)
        || (scalingDirection === 1 && currentValue === 80)
    ) {
        return;
    }

    document.documentElement.style.setProperty(
        '--bg-grid-size', `${currentValue + backgroundGridStepsize * scalingDirection}px`,
    );
}

// TODO mv to formhandling
function configOutput({ target: { name, value } }) {
    drawing.outputConfig[name] = value;
    updateViewBox();
    save('configOutput');
}

function copyDataURIToClipboard() {
    writeToClipboard(generateDataURI());
}

function copyMarkupToClipboard() {
    writeToClipboard(generateMarkUp());
}

function download(url) {
    Object.assign(downloadLink, {
        // TODO use drawing title if it is set
        download: `My_SVG.${drawing.outputConfig['file-format']}`,
        href: url,
    });
    downloadLink.click();
}

/** Finalize drawing a rect or ellipse, which started by adding a point to the active layer. */
function finalizeShape(event) {
    if (!session.drawingShape) return;

    session.drawingShape = false;

    const [x, y] = getSVGCoords(event);
    const { points = [] } = session.activeLayer;
    const size = {
        width: Math.abs(session.shapeStart.x - x),
        height: Math.abs(session.shapeStart.y - y),
    };

    Object.assign(points[0], session.mode === 'rect'
        ? {
            x: Math.min(session.shapeStart.x, x),
            y: Math.min(session.shapeStart.y, y),
            width: size.width,
            height: size.height,
        }
        : {
            rx: size.width,
            ry: size.height,
        });
    save('drawShape');
    setActiveLayerConfig();
    mkControlPoints(
        session.activeLayer,
        session.layerId,
        last(points),
        lastId(points)
    );
    svg.onpointermove = null;
}

// TODO mv to formhandling
function resetTransforms() {
    const { transforms } = defaults;

    if (transformTargetSwitch.checked && session.activeLayer) {
        session.activeLayer.transforms = structuredClone(transforms);
    } else {
        drawing.transforms = structuredClone(transforms);
    }

    applyTransforms(drawing, session);
    setTransformsConfig(transforms);
    save('resetTransforms');
}

// TODO mv to formhandling
function setCenterOfRotation(element, transformTarget) {
    const {
        x,
        y,
        width,
        height,
    } = element.getBBox();
    const coords = [Math.trunc(x + width * 0.5), Math.trunc(y + height * 0.5)];

    [complexTransforms.rotate[1].value, complexTransforms.rotate[2].value] = coords;
    [transformTarget.rotate[1], transformTarget.rotate[2]] = coords;
    save('setCenterofRotation');
}

// TODO mv to formhandling
function setCmd({ target: { value } }) {
    session.cmd = value;
}

// TODO mv to formhandling...cant close over session there
function setFillOrStroke({ target: { name, value } }) {
    if (!session.activeLayer) return;

    session.activeLayer.style[name] = value;

    // NOTE: make sure a change in fill is visible to the user
    if (name === 'fill' && session.activeLayer.style['fill-opacity'] === '0') {
        session.activeLayer.style['fill-opacity'] = '1';
    }

    styleLayer(session.layerId);
}

// TODO mv to formhandling
function setMode({ target: { value }, currentTarget }) {
    if (session.drawingShape) {
        currentTarget.modes.value = session.mode;
        return;
    }

    session.mode = value;

    if (!session.activeLayer) return;

    // if the active layer isnt empty, we add (and focus) a new layer,
    // otherwise we just replace shape and mode of the current one
    if (session.activeLayer.points.length) {
        addLayer();
    } else {
        session.activeLayer.mode = session.mode;
        const shape = configClone(svgTemplates[session.mode])({
            'data-layer-id': session.layerId,
        });
        const oldLayer = session.activeSVGElement;
        oldLayer.replaceWith(shape);
        oldLayer.remove();
        // remove mode-specific style-props of old mode
        Object.keys(session.activeLayer.style).forEach((key) => {
            if (
                key in defaults.styleRelevancies
                && !defaults.styleRelevancies[key].includes(session.mode)
            ) {
                delete session.activeLayer.style[key];
            }
        });
        // add mode-specific style-props of new mode
        Object.assign(session.activeLayer.style, getRelevantConfiguredStyles(session.mode));
        save('setMode');
    }
}

// TODO mv to formhandling
function setTransform({ target: { classList, dataset, name, value } }) {
    // NOTE: 'rotate' and 'scale' have more than one param
    if (classList.contains('transform-config')) {
        const { transform, id } = dataset;
        session.transformTarget[transform][+id] = value;
    } else {
        session.transformTarget[name] = value;
    }

    applyTransforms(drawing, session);
}

// TODO mv to formhandling
function setTransformTarget({ target: { checked } }) {
    if (checked) {
        setTransformsConfig(session.activeLayer
            ? session.activeLayer.transforms
            : defaults.transforms);
    } else {
        setTransformsConfig(drawing.transforms);
    }

    session.transformLayerNotDrawing = checked;
}

// TODO mv to formhandling? activeLayerConfig?
function togglePathClosing({ target }) {
    if (!session.activeLayer) return;

    session.activeLayer.closePath = target.checked;
    drawLayer(session.layerId);
}

function triggerDownload() {
    const svgDataURI = generateDataURI();

    if (drawing.outputConfig['file-format'] === 'svg') {
        download(svgDataURI);
    } else {
        dummyImg.src = svgDataURI;

        if (dummyImageIsSetUp) return;

        dummyImageIsSetUp = true;

        dummyImg.addEventListener('load', () => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            Object.assign(ctx.canvas, {
                width: drawing.outputConfig.width,
                height: drawing.outputConfig.height,
            });
            ctx.drawImage(dummyImg, 0, 0);
            download(canvas.toDataURL());
        });
    }
}

function writeToClipboard(text) {
    window.navigator.clipboard.writeText(text);
}