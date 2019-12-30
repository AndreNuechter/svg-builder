/* globals document */

import { getSVGCoords } from '../helper-functions.js';
import { svg } from '../dom-shared-elements.js';

const coords = document.getElementById('coords');

svg.addEventListener('pointermove', coordToolTips);
svg.addEventListener('pointerleave', () => { coords.style = null; });

function coordToolTips(event) {
    const [x, y] = getSVGCoords(event);

    coords.textContent = `x: ${Math.trunc(x)}, y: ${Math.trunc(y)}`;
    coords.style.left = `${event.pageX - 120}px`;
    coords.style.top = `${event.pageY - 40}px`;
}