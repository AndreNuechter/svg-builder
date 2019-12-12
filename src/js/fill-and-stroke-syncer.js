import { fillAndStroke } from './dom-shared-elements.js';

const { elements } = fillAndStroke;

/**
 * Adjusts the Fill & Stroke fieldset to a given style config.
 * @param { Object } conf The config to be applied.
 */
function setFillAndStrokeFields(conf) {
    Object.entries(conf).forEach(([key, val]) => {
        const field = elements[key];

        if (field.tagName === 'INPUT') {
            field[field.type === 'checkbox' ? 'checked' : 'value'] = val;
        } else {
            [...field.children].forEach((child) => {
                child.selected = (child.value === val);
            });
        }
    });
}

function getNonDefaultStyles(mode) {
    return [...elements]
        .filter(e => e.hasAttribute('name')
            && e.closest('label').classList.contains(`for-${mode}`))
        .reduce((obj, e) => Object.assign(obj, {
            [e.name]: e[e.type === 'checkbox' ? 'checked' : 'value']
        }), {});
}

export {
    getNonDefaultStyles,
    setFillAndStrokeFields
};