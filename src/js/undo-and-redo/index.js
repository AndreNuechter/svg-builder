// import drawing from '../drawing.js';

const stack = [];
let currentIndex = 0;

document.getElementById('undo-btn').addEventListener('click', () => {
    currentIndex -= 1;
    console.log(stack.length);

    // replace drawing with last(stack)
});

export default stack;