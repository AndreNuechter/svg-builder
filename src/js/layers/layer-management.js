import { createControlPoints } from '../control-points/control-point-handling';
import { layerSelectorTemplate } from '../dom-created-elements';
import { layers, layerSelect, layerSelectors, vacancyMsgStyle } from '../dom-shared-elements';
import drawing, { save } from '../drawing/drawing';
import { setFillAndStrokeConfig } from '../form-handling';
import { applyTransforms, configElement } from '../helper-functions';
import session from '../session';

export {
    addLayerSelector,
    deleteLayerSelectors,
    reorderLayerSelectors
};

function addLayerSelector(id = layerSelect.childElementCount) {
    const layerSelector = layerSelectorTemplate.cloneNode(true);
    const [label, selector] = layerSelector.children;

    layerSelector.dataset.layerId = id;
    layerSelector.ondragstart = dragLayerSelector;
    label.oninput = changeLayerLabel;
    configElement(label, {
        textContent: (drawing.layers[id] && drawing.layers[id].label)
            || `Layer ${id + 1}`,
    });
    configElement(selector, {
        value: id,
        checked: session.layerId === layerSelectors.length,
    });
    layerSelect.append(layerSelector);
    reorderLayerSelectors(id);
    vacancyMsgStyle.display = 'none';
}

function changeLayerLabel({ target }) {
    // NOTE: since you have to click on the label to edit it,
    // the edited label belongs to the active layer
    session.activeLayer.label = target.textContent.replace(/\n/g, /\s/).trim();
    save('changeLabel');
}

function deleteLayerSelectors() {
    const layersCount = layers.length;

    vacancyMsgStyle.display = layersCount ? 'none' : 'initial';

    while (layerSelect.childElementCount !== layersCount) {
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
        createControlPoints(session);
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

/**
 * Adjusts layer-ids and labels of layers and selectors affected by re-ordering or deleting.
 * @param { number } startIndex The ordinal of the first affected item.
 * @param { number } endIndex The ordinal of the last affected item.
 */
function reorderLayerSelectors(startIndex = 0, endIndex = layerSelect.childElementCount) {
    for (let i = startIndex; i < endIndex; i += 1) {
        const layerView = layers[i];
        const layerSelector = layerSelect.children[i];
        const [label, radio] = layerSelector.children;

        layerView.dataset.layerId = i;
        layerSelector.dataset.layerId = i;
        label.textContent = drawing.layers[i].label || `Layer ${i + 1}`;
        radio.value = i;
    }
}