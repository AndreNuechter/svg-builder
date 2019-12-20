import { drawing } from './drawing.js';
import {
    layers,
    drawingContent,
    controlPointContainer,
    transformFields
} from './dom-shared-elements.js';
import { stringifyTransforms } from './helper-functions.js';

const rotateInputs = transformFields.elements.rotate.getElementsByTagName('input');

function setTransformsFieldset(conf) {
    Object.entries(conf)
        .filter(([key]) => key !== 'translate') // NOTE: we manage translations via arrow-keys
        .forEach(([key, val]) => {
            if (key === 'rotate') {
                val.forEach((v, i) => { rotateInputs[i].value = v; });
            } else {
                transformFields.elements[key].value = val;
            }
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