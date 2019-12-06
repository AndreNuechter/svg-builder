/* globals document */

import { drawing, save } from './drawing.js';
import { configElement, parseLayerStyle } from './helper-functions.js';
import { defaults } from './constants.js';
import {
    drawingContent,
    layers,
    layerSelect,
    layerSelectors
} from './dom-shared-elements.js';
import { layerSelectorTemplate } from './dom-created-elements.js';
import setFillAndStrokeFields from './fill-and-stroke-syncer.js';
import { applyTransforms, setTransformsFieldset } from './transforms.js';
import modes from './modes.js';

const vacancyMsgStyle = document.getElementById('no-layer-msg').style;

/**
 * Changes the style-related attributes of a layer.
 * @param { number } layerId The ordinal of the affected layer.
 * @param { Object } [conf=drawing.layers[layerId].style] The style-attributes of the affected layer.
 */
function styleLayer(layerId, conf = drawing.layers[layerId].style) {
    configElement(layers[layerId], parseLayerStyle(conf));
    save();
}

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
    configElement(layer, modes[layerData.mode].geometryProps(layerData));
    save();
}

/**
 * Sets up an environment for the callback for the mutation observer and returns the callback.
 * @param { Object } session The session object.
 * @param { Function } remControlPoints A function to remove all control points.
 * @param { Function } mkControlPoint A function to make a control point.
 * @returns { Function } The prepared callback to our mutation observer, reacting to additions and removals of layers.
 */
function observeLayers(session, remControlPoints, mkControlPoint) {
    const dragLayerSelector = (e) => {
        e.dataTransfer.setData('text', e.target.dataset.layerId);
        e.dataTransfer.effectAllowed = 'move';
    };
    const changeLayerLabel = ({ target }) => {
        // NOTE: we assume edition is preceded by selection and the edited label belongs to the active layer
        session.current.label = target.textContent.replace(/\n/g, /\s/).trim();
        save();
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
            // deal w addition of layer (add a corresponding selector)
            if (mutation.addedNodes.length) {
                const layerId = layerSelect.childElementCount;
                const layerSelector = layerSelectorTemplate.cloneNode(true);
                const [label, selector] = layerSelector.children;
                layerSelector.dataset.layerId = layerId;
                configElement(label, {
                    textContent: drawing.layers[layerId]
                        ? drawing.layers[layerId].label || `Layer ${layerId + 1}`
                        : `Layer ${layerId + 1}`
                });
                configElement(selector, {
                    value: layerId,
                    checked: session.layer === layerSelectors.length
                });
                layerSelector.ondragstart = dragLayerSelector;
                label.oninput = changeLayerLabel;
                layerSelect.append(layerSelector);
            }

            // deal w removal of layer(s)
            if (mutation.removedNodes.length) {
                // delete selector
                const id = +mutation
                    .removedNodes[0]
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
                    applyTransforms(session);
                    setFillAndStrokeFields(defaults.style);
                    return;
                }

                if (session.layer === layers.length) {
                    session.layer -= 1;
                } else {
                    const cb = mkControlPoint(session.layer);
                    session.mode = session.current.mode;
                    remControlPoints();
                    session.current.points.forEach(cb);
                    setFillAndStrokeFields(session.current.style);
                    reorderLayerSelectors(id, layerSelect.childElementCount - 1);
                }

                // check the active layer's selector
                layerSelectors[session.layer].checked = true;
            }
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
 * Constructor for a default layer.
 * @param { string } mode [ path | rect | ellipse ]
 * @param { Object } style
 * @param { Object } transforms
 * @returns { Object }
 */
function Layer(mode, style, transforms) {
    return {
        mode,
        points: [],
        style,
        transforms
    };
}

export {
    drawLayer,
    Layer,
    observeLayers,
    reorderLayerSelectors,
    styleLayer
};