/* globals document */

import { configElement } from './helper-functions.js';

const ns = 'http://www.w3.org/2000/svg';
const layerSelectorTemplate = (() => {
    const label = configElement(document.createElement('label'), { draggable: true });
    const labelTextContainer = configElement(document.createElement('span'), {
        contenteditable: true
    });
    const selector = configElement(document.createElement('input'), {
        type: 'radio',
        name: 'layer-selector'
    });

    label.append(labelTextContainer, selector);

    return label;
})();
const circleTemplate = (() => configElement(document.createElementNS(ns, 'circle'), {
    r: 3,
    class: 'control-point'
}))();
const svgTemplates = {
    path: document.createElementNS(ns, 'path'),
    rect: document.createElementNS(ns, 'rect'),
    ellipse: document.createElementNS(ns, 'ellipse')
};

export {
    layerSelectorTemplate,
    circleTemplate,
    svgTemplates
};