import {
    drawLayer,
    styleLayer,
} from './layers/layer-handling.js';
import {
    backgroundGridStepsize,
    defaults,
} from './constants.js';
import {
    configClone,
    configForm,
    getRelevantConfiguredStyles,
    getSVGCoords,
    last,
    lastId,
} from './helper-functions.js';
import { svgTemplates } from './dom-creations.js';
import {
    controlPointContainer,
    fillAndStrokeFields,
    svg,
} from './dom-selections.js';
import { mkControlPoints } from './control-points/control-point-handling.js';
import {
    redo,
    save,
} from './drawing/drawing.js';
import session from './session.js';
import layerTypes from './layers/layer-types.js';
import { addLayer } from './layers/layer-management.js';
import { setActiveLayerConfig } from './layers/active-layer-config.js';

// TODO split this module up

export {
    addPoint,
    changeBackgroundGridSize,
    finalizeShape,
    redo,
    setFillAndStrokeConfig,
    setFillOrStroke,
    setMode,
};

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

function changeBackgroundGridSize({ deltaY }) {
    const currentValue = Number(
        document.documentElement.style.getPropertyValue('--bg-grid-size').replace('px', '') || 40,
    );
    // deltaY is negative when scrolling up
    const scalingDirection = deltaY < 0 ? -1 : 1;

    // acceptable range for gridsize is (x: 10 >= x <= 80)
    if ((scalingDirection === -1 && currentValue === 10)
        || (scalingDirection === 1 && currentValue === 80)
    ) return;

    document.documentElement.style.setProperty(
        '--bg-grid-size', `${currentValue + backgroundGridStepsize * scalingDirection}px`,
    );
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

/**
 * Adjusts the Fill & Stroke fieldset to a given style config.
 * @param { Object } style The config to be applied.
 */
function setFillAndStrokeConfig(style) {
    configForm(fillAndStrokeFields, style);
}

function setFillOrStroke({ target: { name, value } }) {
    if (!session.activeLayer) return;

    session.activeLayer.style[name] = value;

    // NOTE: make sure a change in fill is visible to the user
    if (name === 'fill' && session.activeLayer.style['fill-opacity'] === '0') {
        session.activeLayer.style['fill-opacity'] = '1';
    }

    styleLayer(session.layerId);
}

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