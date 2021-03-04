import { configElement, stringifyTransforms } from './helper-functions.js';
import { defaults } from './constants.js';
import {
    drawingContent,
    layers,
    layerSelect,
    layerSelectors
} from './dom-shared-elements.js';
import { setFillAndStrokeConfig, setTransformsConfig } from './form-handling.js';
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
 * @param { SVGPathElement | SVGRectElement | SVGEllipseElement } [layerId=session.layerId] The affected SVG-element.
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
 * @returns {{ mode: String, points: Point[], style: {}, transforms: {} }}
 */
function Layer(mode, style, transforms) {
    return Object.assign(Object.create(null), {
        mode,
        points: [],
        style,
        transforms
    });
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
        save('changeLabel');
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
            checked: session.layerId === layerSelectors.length
        });
        layerSelect.append(layerSelector);
    };
    const removeLayerSelector = () => layerSelect.lastChild.remove();

    return (mutationsList) => {
        // hide/show a message when no layers exist
        vacancyMsgStyle.display = drawingContent.childElementCount ? 'none' : 'initial';

        // prevent interfering w reordering
        if (session.reordering) {
            session.reordering = false;
            return;
        }

        mutationsList.forEach(({ addedNodes, removedNodes }) => {
            removedNodes.forEach(removeLayerSelector);
            addedNodes.forEach(addLayerSelector);
        });

        if (mutationsList.find(({ removedNodes }) => removedNodes.length)) {
            remControlPoints();

            if (!layers.length) {
                delete session.layerId;
                setFillAndStrokeConfig(defaults.style);
                setTransformsConfig(defaults.transforms);
                drawingContent.setAttribute('transform', stringifyTransforms(defaults.transforms));
            } else if (session.layerId === layers.length) {
                session.layerId -= 1;
            } else {
                // NOTE: quickfix for undoing deletion
                // TODO: restore active layer?!
                if (session.layerId === undefined) {
                    session.layerId = 0;
                }

                const cb = mkControlPoint(session.activeLayer, session.layerId);
                setFillAndStrokeConfig(session.activeLayer.style);
                reorderLayerSelectors(0, layerSelect.childElementCount - 1);
                session.activeLayer.points.forEach(cb);
                session.mode = session.activeLayer.mode;
            }

            // check the active layer's selector
            if (layerSelectors[session.layerId]) {
                layerSelectors[session.layerId].checked = true;
            }
        }
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
        const [label, radio] = selector.children;
        selector.dataset.layerId = i;
        layers[i].dataset.layerId = i;
        label.textContent = drawing.layers[i].label || `Layer ${i + 1}`;
        radio.value = i;
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