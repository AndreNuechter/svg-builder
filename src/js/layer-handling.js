import {
    applyTransforms,
    configElement,
    setFillAndStrokeFields,
    setTransformsFieldset
} from './helper-functions.js';
import { defaults } from './constants.js';
import {
    drawingContent,
    layers,
    layerSelect,
    layerSelectors
} from './dom-shared-elements.js';
import { layerSelectorTemplate } from './dom-created-elements.js';
import drawing, { save } from './drawing.js';
import layerTypes from './layer-types.js';

const vacancyMsgStyle = document.getElementById('no-layer-msg').style;

export {
    drawLayer,
    Layer,
    observeLayers,
    reorderLayerSelectors,
    styleLayer
};

/**
 * Syncs geometry attributes of a layers representation w the data.
 * @param { number } layerId The ordinal number of the affected layer.
 * @param { SVGPathElement | SVGRectElement | SVGEllipseElement } [layerId=session.layer] The affected SVG-element.
 * @param { Object } [layerData=drawing.layers[layerId]] The affected layer. Defaults to the current.
 */
function drawLayer(
    layerId,
    layer = layers[layerId],
    layerData = drawing.layers[layerId]
) {
    configElement(layer, layerTypes[layerData.mode].geometryProps(layerData));
}

/**
 * Constructor for a default layer.
 * @param { string } mode [ path | rect | ellipse ]
 * @param { Object } style defaults.style + type-specific styles
 * @param { Object } transforms defaults.transforms
 * @returns Layer
 */
function Layer(mode, style, transforms) {
    return {
        mode,
        points: [],
        style,
        transforms
    };
}

/**
 * Sets up an environment for the callback for the mutation-observer (that ensures the layer-selection ui-elements are in line with the drawing) and returns the callback.
 * @param { Object } session The session object.
 * @param { Function } remControlPoints A function to remove all control points.
 * @param { Function } mkControlPoint A function to make a control point.
 * @returns { Function } The prepared callback to our mutation observer, reacting to additions and removals of layers.
 */
function observeLayers(session, remControlPoints, mkControlPoint) {
    const dragLayerSelector = (event) => {
        event.dataTransfer.setData('text', event.target.dataset.layerId);
        event.dataTransfer.effectAllowed = 'move';
    };
    const changeLayerLabel = ({ target }) => {
        // NOTE: since you have to click on the label to edit it,
        // the edited label belongs to the active layer
        session.activeLayer.label = target.textContent.replace(/\n/g, /\s/).trim();
        save();
    };
    const addLayerSelector = () => {
        const layerId = layerSelect.childElementCount;
        const layerSelector = layerSelectorTemplate.cloneNode(true);
        const [label, selector] = layerSelector.children;
        layerSelector.dataset.layerId = layerId;
        layerSelector.ondragstart = dragLayerSelector;
        label.oninput = changeLayerLabel;
        configElement(label, {
            textContent: (drawing.layers[layerId] && drawing.layers[layerId].label)
                || `Layer ${layerId + 1}`
        });
        configElement(selector, {
            value: layerId,
            checked: session.layer === layerSelectors.length
        });
        layerSelect.append(layerSelector);
    };
    const removeLayerSelector = (removedNode) => {
        // delete selector
        const id = +removedNode
            .dataset
            .layerId;
        layerSelect
            .lastChild
            .remove();

        // if there're no layers left, we do some clean-up and are done
        if (!layers.length) {
            delete session.layer;
            remControlPoints();
            setTransformsFieldset(defaults.transforms);
            applyTransforms(drawing, session);
            setFillAndStrokeFields(defaults.style);
            return;
        }

        if (session.layer === layers.length) {
            session.layer -= 1;
        } else {
            const cb = mkControlPoint(session.activeLayer, session.layer);
            session.mode = session.activeLayer.mode;
            remControlPoints();
            session.activeLayer.points.forEach(cb);
            setFillAndStrokeFields(session.activeLayer.style);
            reorderLayerSelectors(id, layerSelect.childElementCount - 1);
        }

        // check the active layer's selector
        layerSelectors[session.layer].checked = true;
    };

    return (mutationsList) => {
        // hide/show a message when no layers exist
        vacancyMsgStyle.display = drawingContent.childElementCount ? 'none' : 'initial';

        // prevent interfering w reordering
        if (session.reordering) {
            session.reordering = false;
            return;
        }

        mutationsList.forEach((mutation) => {
            mutation.addedNodes.forEach(addLayerSelector);
            mutation.removedNodes.forEach(removeLayerSelector);
        });
    };
}

/**
 * Adjusts layer-ids and labels of layers and selectors affected by re-ordering or deleting.
 * @param { number } startIndex The ordinal of the first affected item.
 * @param { number } endIndex The ordinal of the last affected item.
 */
function reorderLayerSelectors(startIndex, endIndex) {
    for (let i = startIndex; i <= endIndex; i += 1) {
        const selector = layerSelect.children[i];
        selector.dataset.layerId = i;
        layers[i].dataset.layerId = i;
        selector.children[0].textContent = drawing.layers[i].label || `Layer ${i + 1}`;
        selector.children[1].value = i;
    }
}

/**
 * Changes the style-related attributes of a layer.
 * @param { number } layerId The ordinal of the affected layer.
 * @param { Object } [conf=drawing.layers[layerId].style] The style-attributes of the affected layer.
 */
function styleLayer(layerId, conf = drawing.layers[layerId].style) {
    configElement(layers[layerId], conf);
}