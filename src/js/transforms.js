import { drawing } from './drawing.js';
import { defaults } from './constants.js';
import {
    layers,
    drawingContent,
    controlPointContainer,
    transformFields
} from './dom-shared-elements.js';
import { stringifyTransforms } from './helper-functions.js';

function setTransformsFieldset(conf = defaults.transforms) {
    Object.entries(conf)
        .filter(([key]) => key !== 'translate') // NOTE: we manage translations via arrow-keys
        .forEach(([key, val]) => {
            const value = (key === 'rotate')
                ? val.slice(0, val.indexOf(','))
                : val; // NOTE: rotate gets 3 params
            transformFields.elements[key].value = value;
        });
}

/**
 * Applies transforms to the layer-container,
 * the currently active layer and its control points.
 */
function applyTransforms(session) {
    const drawingTransforms = stringifyTransforms(drawing.transforms);
    const applicants = [drawingContent, controlPointContainer];
    const transformations = [drawingTransforms];

    if (layers[session.layer]) {
        const layerTransforms = stringifyTransforms(session.current.transforms);
        applicants.push(layers[session.layer]);
        transformations.push(drawingTransforms + layerTransforms, layerTransforms);
    } else {
        transformations.push(drawingTransforms);
    }

    applicants.forEach((a, i) => a.setAttribute('transform', transformations[i]));
}

export {
    applyTransforms,
    setTransformsFieldset
};