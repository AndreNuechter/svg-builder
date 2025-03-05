import { remControlPoints, updateControlPoints } from '../control-points/control-point-handling';
import { layerSelectorTemplate, svgTemplates } from '../dom-creations';
import {
    drawingContent,
    layers,
    layerSelect,
    layerSelectors,
    vacancyMsgStyle
} from '../dom-selections';
import { setFillAndStrokeConfig } from '../form-handling';
import {
    applyTransforms,
    configClone,
    configElement,
    getRelevantConfiguredStyles,
    getRelevantDefaultStyles,
    lastId
} from '../helper-functions';
import { setActiveLayerConfig } from './active-layer-config';
import drawing, { save } from '../drawing/drawing';
import session from '../session';
import { Layer } from './layer-handling';
import { defaults } from '../constants';

export {
    addLayer,
    addLayerSelector,
    changeLayerLabel,
    deleteLayerSelectors,
    dragLayerSelector,
    dragLayerSelectorOver,
    duplicateLayer,
    reorderLayers,
    selectOrDeleteLayer,
    startDraggingLayerSelector
};

function addLayer() {
    drawing.layers.push(Layer(
        session.mode,
        (!session.activeLayer
            ? getRelevantConfiguredStyles
            : getRelevantDefaultStyles)(session.mode),
        // TODO see above for styles. Should we use the previously configured transform values on a blank canvas?
        structuredClone(defaults.transforms),
    ));
    session.layerId = lastId(drawing.layers);
    drawingContent.append(configClone(svgTemplates[session.mode])({
        'data-layer-id': session.layerId,
    }));
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
    // delete the data
    drawing.layers.splice(id, 1);
    save('deleteLayer');
    // delete the svg element
    layers[id].remove();
    // delete the layer selector
    deleteLayerSelectors();

    if (id === session.layerId || layers.length === 0) {
        // NOTE: might have been called before as `deleteLayerSelectors` can change the layerId
        remControlPoints();
        setActiveLayerConfig();

        if (layers.length === 0) return;

        // NOTE: this needs to happen now because deleting the last layer,
        // before `deleteLayerSelectors` had a chance to correct the layerId,
        // would cause an invalid lookup
        session.mode = session.activeLayer.mode;
    }
}

// TODO can we keep this local or get rid of it?...in here it's only used in deleteLayer and outside in initCanvas
function deleteLayerSelectors() {
    const layersCount = layers.length;

    vacancyMsgStyle.display = layersCount ? 'none' : 'initial';

    while (layerSelect.childElementCount > layersCount) {
        layerSelect.lastChild.remove();
    }

    if (layersCount === 0) {
        session.layerId = undefined;
    } else if (session.layerId === layersCount) {
        session.layerId -= 1;
    } else {
        // NOTE: quickfix for undoing deletion
        // TODO: restore active layer?!...in resetCanvas()?
        if (session.layerId === undefined) {
            session.layerId = 0;
        }

        applyTransforms(drawing, session);
        reorderLayerSelectors(session.layerId);
        setFillAndStrokeConfig(session.activeLayer.style);
        updateControlPoints(session);
        session.mode = session.activeLayer.mode;
    }

    // check the active layer's selector
    if (layerSelectors[session.layerId]) {
        layerSelectors[session.layerId].checked = true;
    }
}

function dragLayerSelector(event) {
    event.dataTransfer.setData('text', event.target.dataset.layerId);
    event.dataTransfer.effectAllowed = 'move';
}

// NOTE: this handler is just here so that the container is properly designated as a dropzone
function dragLayerSelectorOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function duplicateLayer() {
    drawing.layers.splice(session.layerId, 0, structuredClone(session.activeLayer));
    session.activeSVGElement.after(session.activeSVGElement.cloneNode(true));
    session.layerId += 1;
    addLayerSelector(session.layerId);
    save('ctrl+c');
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
        deleteLayer(label.dataset.layerId);
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