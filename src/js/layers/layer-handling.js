import { remControlPoints, updateControlPoints } from '../control-points/control-point-handling.js';
import { layerSelectorTemplate, svgTemplates } from '../dom-creations.js';
import {
    drawingContent,
    layers,
    layerSelect,
    layerSelectors,
    vacancyMsgStyle
} from '../dom-selections.js';
import {
    configClone,
    configElement,
    getRelevantConfiguredStyles,
    getRelevantDefaultStyles,
    lastId
} from '../helper-functions.js';
import { setActiveLayerConfig } from './active-layer-config.js';
import drawing, { save } from '../drawing/drawing.js';
import session from '../session.js';
import { defaults } from '../constants.js';
import { applyTransforms } from '../transform-handling.js';
import { setFillAndStrokeConfig } from '../fill-and-stroke-handling.js';
import layerTypes from './layer-types.js';

export {
    addLayer,
    addLayerSelector,
    changeLayerLabel,
    dragLayerSelector,
    dragLayerSelectorOver,
    drawLayer,
    duplicateLayer,
    reorderLayers,
    selectOrDeleteLayer,
    startDraggingLayerSelector,
    styleLayer,
};

function addLayer() {
    drawing.layers.push(
        Layer(
            session.mode,
            (session.activeLayer
                ? getRelevantDefaultStyles
                : getRelevantConfiguredStyles)(session.mode),
            // TODO see above for styles. Should we use the previously configured transform values on a blank canvas?
            structuredClone(defaults.transforms),
        )
    );
    session.layerId = lastId(drawing.layers);
    drawingContent.append(
        configClone(
            svgTemplates[session.mode],
            { 'data-layer-id': session.layerId }
        )
    );
    addLayerSelector(session.layerId);
}

function addLayerSelector(id = layerSelect.childElementCount) {
    if (layerSelect.childElementCount >= drawing.layers.length) return;

    const layerSelector = layerSelectorTemplate.cloneNode(true);
    const [, label, selector] = layerSelector.children;

    vacancyMsgStyle.display = 'none';
    layerSelector.dataset.layerId = id;
    label.value = drawing.layers[id]?.label || `Layer ${id + 1}`;
    configElement(selector, {
        value: id,
        checked: session.layerId === layerSelectors.length,
    });
    layerSelect.append(layerSelector);
    reorderLayerSelectors(id);
}

function changeLayerLabel({ target }) {
    // NOTE: since you have to click on the label to edit it,
    // we know the edited label belongs to the active layer
    session.activeLayer.label = target.value.replace(/\n/g, /\s/).trim();
    save('changeLabel');
}

function deleteLayer(id) {
    const userDeletedActiveLayer = id === session.layerId;

    // delete the data
    drawing.layers.splice(id, 1);
    save('deleteLayer');
    // delete the svg element
    layers[id].remove();
    // delete the layer selector
    layerSelect.children[id].remove();

    if (layers.length === 0) {
        // all layers have been deleted, so we...
        // reset the layerId,
        session.layerId = -1;
        // show the no-layers message and
        vacancyMsgStyle.display = 'initial';
        // rm the cps
        remControlPoints();

        return;
    }

    // the user deleted a layer before the active layer, so we need to decrement layerId
    if (id < session.layerId || session.layerId === layers.length) {
        session.layerId -= 1;
    }

    // the active layer changed, so we adjust drawing and ui to the new one
    if (userDeletedActiveLayer) {
        applyTransforms(drawing, session);
        setActiveLayerConfig();
        setFillAndStrokeConfig(session.activeLayer.style);
        updateControlPoints(session);
    }

    // update the following layer selector labels
    reorderLayerSelectors(id);
    // check the now active layer's selector
    layerSelectors[session.layerId].checked = true;
    // select the mode of the now active layer
    session.mode = session.activeLayer.mode;
}

function dragLayerSelector(event) {
    event.dataTransfer.setData('text', event.target.dataset.layerId);
    event.dataTransfer.effectAllowed = 'move';
}

// NOTE: this handler does only exist so that the container is properly designated as a dropzone
function dragLayerSelectorOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

/**
 * Syncs geometry attributes of a layers representation w the data.
 * @param { number } layerId The ordinal number of the affected layer.
 * @param { SVGPathElement | SVGRectElement | SVGEllipseElement } [layerId=session.layerId] The affected SVG-element.
 * @param { Object } [layerData=drawing.layers[layerId]] The affected layer. Defaults to the current.
 */
function drawLayer(
    layerId,
    layer = layers[layerId],
    layerData = drawing.layers[layerId],
) {
    configElement(layer, layerTypes[layerData.mode].geometryProps(layerData));
}

function duplicateLayer() {
    if (!session.activeSVGElement) return;

    drawing.layers.splice(session.layerId, 0, structuredClone(session.activeLayer));
    session.activeSVGElement.after(session.activeSVGElement.cloneNode(true));
    session.layerId += 1;
    addLayerSelector(session.layerId);
    save('ctrl+c');
}

/**
 * Constructor for a default layer.
 * @param { string } mode [ path | rect | ellipse ]
 * @param { Object } style Mode-specific defaults.style
 * @param { Object } transforms defaults.transforms
 * @returns {{ mode: String, points: Point[], style: {}, transforms: {} }}
 */
function Layer(mode, style, transforms) {
    return Object.assign(Object.create(null), {
        mode,
        points: [],
        style,
        transforms,
    });
}

function reorderLayers(event) {
    const droppedOnSelector = event.target.closest('label');
    const droppedOnId = Number(droppedOnSelector.dataset.layerId);
    const droppedOnLayer = layers[droppedOnId];
    const draggedId = Number(event.dataTransfer.getData('text'));
    const draggedLayer = layers[draggedId];
    const [draggedLayerData] = drawing.layers.splice(draggedId, 1);

    // re-order the layer data
    drawing.layers.splice(droppedOnId, 0, draggedLayerData);
    save('reorderLayer');

    // insert dragged layerselector before or after the one dropped on, depending on its origin
    if (draggedId < droppedOnId) {
        droppedOnLayer.after(draggedLayer);
    } else {
        drawingContent.insertBefore(draggedLayer, droppedOnLayer);
    }

    // we want the active layer to remain active,
    // so we have to add or subtract 1 to/from session.layerId or
    // set it to the one dropped on
    if (draggedId === session.layerId) {
        session.layerId = droppedOnId;
    } else {
        if (draggedId > session.layerId && droppedOnId <= session.layerId) {
            session.layerId += 1;
        } else if (draggedId < session.layerId && droppedOnId > session.layerId) {
            session.layerId -= 1;
        }
    }

    layerSelect.children[session.layerId].draggable = false;
    reorderLayerSelectors(
        Math.min(draggedId, droppedOnId),
        Math.max(draggedId, droppedOnId) + 1
    );
    layerSelectors[session.layerId].checked = true;
    event.preventDefault();
}

/**
 * Adjusts layer-ids and labels of layers and selectors affected by re-ordering or deleting.
 * @param { number } startIndex The ordinal of the first affected item.
 * @param { number } endIndex The ordinal of the last affected item.
 */
function reorderLayerSelectors(startIndex = 0, endIndex = layerSelect.childElementCount) {
    for (let index = startIndex; index < endIndex; index += 1) {
        const layerView = layers[index];
        const layerSelector = layerSelect.children[index];
        const [, label, radio] = layerSelector.children;

        layerView.dataset.layerId = index;
        layerSelector.dataset.layerId = index;
        label.value = drawing.layers[index].label || `Layer ${index + 1}`;
        radio.value = index;
    }
}

function selectOrDeleteLayer({ target }) {
    const label = target.closest('.layer-selector');

    if (!label) return;

    // user clicked the delete btn
    if (target.classList.contains('layer-selector__delete-btn')) {
        deleteLayer(Number(label.dataset.layerId));
        return;
    }

    // user clicked somewhere else so we select this layer
    const radioInput = label.querySelector('input[type="radio"]');
    const layerId = Number(radioInput.value);

    session.layerId = layerId;
    session.mode = session.activeLayer.mode;
    radioInput.checked = true;
}

/** Enable dragging a layerselector when the handle receives a pointerdown event. */
function startDraggingLayerSelector({ target }) {
    if (!target.classList.contains('layer-selector__handle')) return;

    target.parentElement.draggable = true;
}

/**
 * Changes the style-related attributes of a layer.
 * @param { number } layerId The ordinal of the affected layer.
 * @param { Object } [conf=drawing.layers[layerId].style] The style-attributes of the affected layer.
 */
function styleLayer(layerId, conf = drawing.layers[layerId].style) {
    configElement(layers[layerId], conf);
}