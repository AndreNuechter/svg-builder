import { getSVGCoords } from '../helper-functions.js';
import { svg } from '../dom-selections.js';

const coords = document.getElementById('coords');

export default (() => {
    svg.addEventListener('pointermove', showSVGCoordsInTooltip);
    svg.addEventListener('pointerleave', resetCoordsDisplay);
})();

function showSVGCoordsInTooltip(event) {
    const [x, y] = getSVGCoords(event);

    coords.textContent = `x: ${Math.trunc(x)}, y: ${Math.trunc(y)}`;
    coords.style.left = `${event.x - 120}px`;
    coords.style.top = `${event.y - 40}px`;
}

function resetCoordsDisplay() {
    coords.style = null;
}