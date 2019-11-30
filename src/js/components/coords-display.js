/* globals document */

import { getSVGCoords } from '../helper-functions.js';
import { svg } from '../dom-shared-elements.js';

const coords = document.getElementById('coords');

svg.addEventListener('mousemove', coordToolTips);
svg.addEventListener('mouseover', coordToolTips);
svg.addEventListener('mouseleave', () => {
    coords.style = null;
});

function coordToolTips(e) {
    const [x, y] = getSVGCoords(e);
    coords.textContent = `x: ${x}, y: ${y}`;
    coords.style.left = `${e.pageX - 120}px`;
    coords.style.top = `${e.pageY - 40}px`;
}