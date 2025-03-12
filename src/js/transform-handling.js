import { complexTransforms, defaults } from './constants';
import {
    controlPointContainer, drawingContent, svg, transformFields, transformTargetSwitch
} from './dom-selections';
import drawing, { save } from './drawing/drawing';
import { configInput } from './helper-functions';
import session from './session';

export {
    applyTransforms,
    centerRotation,
    resetTransforms,
    setTransform,
    setTransformsConfig,
    setTransformTarget,
    stringifyTransforms
};

/**
 * Applies transforms to the layer-container,
 * the currently active layer and its control points.
 */
function applyTransforms(drawing, session) {
    const drawingTransforms = stringifyTransforms(drawing.transforms);
    const applicants = [drawingContent, controlPointContainer];
    const transformations = [drawingTransforms];

    if (session.activeSVGElement) {
        const layerTransforms = stringifyTransforms(session.activeLayer.transforms);

        applicants.push(session.activeSVGElement);
        transformations.push(
            drawingTransforms + layerTransforms,
            layerTransforms
        );
    } else {
        transformations.push(drawingTransforms);
    }

    applicants.forEach((a, i) => a.setAttribute('transform', transformations[i]));
}

function centerRotation() {
    const args = session.transformLayerNotDrawing
        ? [session.activeSVGElement, session.activeLayer.transforms]
        : [svg.firstElementChild, drawing.transforms];

    setCenterOfRotation(...args);
    applyTransforms(drawing, session);
}

function resetTransforms() {
    const { transforms } = defaults;

    if (transformTargetSwitch.checked && session.activeLayer) {
        session.activeLayer.transforms = structuredClone(transforms);
    } else {
        drawing.transforms = structuredClone(transforms);
    }

    applyTransforms(drawing, session);
    setTransformsConfig(transforms);
    save('resetTransforms');
}

function setCenterOfRotation(element, transformTarget) {
    const {
        x,
        y,
        width,
        height,
    } = element.getBBox();
    const coords = [Math.trunc(x + width * 0.5), Math.trunc(y + height * 0.5)];

    [complexTransforms.rotate[1].value, complexTransforms.rotate[2].value] = coords;
    [transformTarget.rotate[1], transformTarget.rotate[2]] = coords;
    save('setCenterofRotation');
}

function setTransform({ target: { classList, dataset, name, value } }) {
    // NOTE: transforms w this class have more than one param and associated input
    if (classList.contains('transform-config')) {
        const { transform, id } = dataset;

        session.transformTarget[transform][Number(id)] = value;
    } else {
        session.transformTarget[name] = value;
    }

    applyTransforms(drawing, session);
}

/**
 * Adjusts the transform-related inputs to a given config.
 * @param { Object } conf The config to be applied.
 */
function setTransformsConfig(conf) {
    Object.entries(conf)
        .forEach(([key, val]) => {
            if (complexTransforms[key]) {
                val.forEach((v, i) => configInput(complexTransforms[key][i], v));
            } else {
                configInput(transformFields[key], val);
            }
        });
}

function setTransformTarget({ target: { checked } }) {
    if (checked) {
        setTransformsConfig(session.activeLayer
            ? session.activeLayer.transforms
            : defaults.transforms);
    } else {
        setTransformsConfig(drawing.transforms);
    }

    session.transformLayerNotDrawing = checked;
}

/**
 * Reduces an object of svg-transforms into a string, readily inserted into HTML.
 * @param { Object } transformData The transforms to be stringified.
 * @returns { string } The stringified transforms.
 */
function stringifyTransforms(transformData) {
    return Object
        .entries(transformData)
        .reduce(
            (str, [key, val]) => `${str}${key}(${
                // NOTE: scale and rotate take more than 1 param, of which some may be ''
                typeof val === 'object'
                    ? val.filter((val) => val !== '')
                    : val
            })`,
            ''
        );
}