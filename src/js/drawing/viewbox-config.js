import { svg } from '../dom-selections';

const viewboxConfig = document.getElementById('viewbox-config');
const {
    'min-x': minX,
    'min-y': minY,
    width: width,
    height: height,
} = viewboxConfig.elements;

window.addEventListener('DOMContentLoaded', () => {
    // set default values on start
    minX.value = 0;
    minY.value = 0;
    width.value = svg.width.baseVal.value;
    height.value = svg.height.baseVal.value;
}, { once: true });

viewboxConfig.addEventListener('input', () => {
    // TODO store the changes?
    svg.setAttribute('viewBox', `${minX.value} ${minY.value} ${width.value} ${height.value}`);
});