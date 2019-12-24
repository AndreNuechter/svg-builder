// TODO: include under heler funcs?

import { fillAndStroke } from './dom-shared-elements.js';

const { elements } = fillAndStroke;

export {
    getNonDefaultStyles,
    setFillAndStrokeFields
};

/**
 * Adjusts the Fill & Stroke fieldset to a given style config.
 * @param { Object } conf The config to be applied.
 */
function setFillAndStrokeFields(conf) {
    Object.entries(conf).forEach(([key, val]) => {
        const field = elements[key];

        if (field.tagName === 'INPUT') {
            field.value = val;
        } else {
            [...field.children].forEach((child) => {
                child.selected = (child.value === val);
            });
        }
    });
}

function getNonDefaultStyles(mode) {
    return [...elements]
        .filter(element => element.hasAttribute('name')
            && element.closest('label').classList.contains(`for-${mode}`))
        .reduce((obj, element) => Object.assign(obj, {
            [element.name]: element.value
        }), {});
}