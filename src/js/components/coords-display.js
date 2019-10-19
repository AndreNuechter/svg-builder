/* globals document */

import { getMousePos } from '../helper-functions.js';

const svg = document.getElementById('outer-container');
const drawingBoundingRect = svg.getBoundingClientRect();
const coords = document.getElementById('coords');

svg.addEventListener('mousemove', coordToolTips);
svg.addEventListener('mouseover', coordToolTips);
svg.addEventListener('mouseleave', () => {
    coords.style = null;
});

function coordToolTips(e) {
    const [x, y] = getMousePos(drawingBoundingRect, e);
    coords.textContent = `x: ${x}, y: ${y}`;
    coords.style.left = `${e.pageX - 16}px`;
    coords.style.top = `${e.pageY - 32}px`;
}