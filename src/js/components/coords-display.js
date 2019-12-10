/* globals document */

import { getSVGCoords } from '../helper-functions.js';
import { svg } from '../dom-shared-elements.js';

const coords = document.getElementById('coords');

svg.addEventListener('pointermove', coordToolTips);
svg.addEventListener('pointerleave', () => { coords.style = null; });

function coordToolTips(e) {
    const [x, y] = getSVGCoords(e);
    coords.textContent = `x: ${Math.trunc(x)}, y: ${Math.trunc(y)}`;
    coords.style.left = `${e.pageX - 120}px`;
    coords.style.top = `${e.pageY - 40}px`;
}