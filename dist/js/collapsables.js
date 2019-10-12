/* globals document */

const legends = [...document.getElementsByClassName('togglable')];
legends.forEach((l) => {
    l.onclick = ({ target }) => {
        target.parentNode.classList.toggle('open');
        target.parentNode.classList.toggle('closed');
    };
});