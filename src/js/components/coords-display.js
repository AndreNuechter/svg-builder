/* globals document */

import { getMousePos } from '../helper-functions.js';

const svg = document.getElementById('outer-container');
const coords = document.getElementById('coords');

svg.addEventListener('mousemove', coordToolTips);
svg.addEventListener('mouseover', coordToolTips);
svg.addEventListener('mouseleave', () => {
    coords.style = null;
});

function coordToolTips(e) {
    const [x, y] = getMousePos(svg, e);
    coords.textContent = `x: ${x}, y: ${y}`;
    coords.style.left = `${e.pageX - 120}px`;
    coords.style.top = `${e.pageY - 40}px`;
}