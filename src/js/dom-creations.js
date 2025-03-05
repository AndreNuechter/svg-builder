import { configElement } from './helper-functions.js';

const ns = 'http://www.w3.org/2000/svg';
export const layerSelectorTemplate = (() => {
    const wrapper = configElement(document.createElement('label'), { class: 'layer-selector' });
    const handle = configElement(document.createElement('span'), {
        class: 'layer-selector__handle',
    });
    const labelTextContainer = configElement(document.createElement('input'), {
        class: 'layer-selector__label'
    });
    const selector = configElement(document.createElement('input'), {
        type: 'radio',
        name: 'layer-selector',
    });
    const deleteBtn = configElement(document.createElement('button'), {
        class: 'layer-selector__delete-btn',
        textContent: 'x',
        title: 'Delete layer'
    });

    wrapper.append(handle, labelTextContainer, selector, deleteBtn);

    return wrapper;
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