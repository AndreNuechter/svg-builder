import { configElement } from '../helper-functions.js';
import { layers } from '../dom-selections.js';
import drawing from '../drawing/drawing.js';
import layerTypes from './layer-types.js';

export {
    drawLayer,
    Layer,
    styleLayer,
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
    layerData = drawing.layers[layerId],
) {
    configElement(layer, layerTypes[layerData.mode].geometryProps(layerData));
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

/**
 * Changes the style-related attributes of a layer.
 * @param { number } layerId The ordinal of the affected layer.
 * @param { Object } [conf=drawing.layers[layerId].style] The style-attributes of the affected layer.
 */
function styleLayer(layerId, conf = drawing.layers[layerId].style) {
    configElement(layers[layerId], conf);
}