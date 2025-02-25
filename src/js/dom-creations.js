import { configElement } from './helper-functions.js';

const ns = 'http://www.w3.org/2000/svg';
export const layerSelectorTemplate = (() => {
    const label = configElement(document.createElement('label'), { draggable: true, class: 'layer-selector' });
    const labelTextContainer = configElement(document.createElement('span'), {
        contenteditable: true,
    });
    const selector = configElement(document.createElement('input'), {
        type: 'radio',
        name: 'layer-selector',
    });

    label.append(labelTextContainer, selector);

    return label;
})();
export const svgTemplates = {
    path: document.createElementNS(ns, 'path'),
    rect: document.createElementNS(ns, 'rect'),
    ellipse: document.createElementNS(ns, 'ellipse'),
};
export const lineTemplate = document.createElementNS(ns, 'line');
export const circleTemplate = configElement(document.createElementNS(ns, 'circle'), { r: 3 });
export const downloadLink = document.createElement('a');
export const dummyImg = document.createElement('img');
export const canvas = document.createElement('canvas');