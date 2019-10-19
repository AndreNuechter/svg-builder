/* globals document */

[...document.getElementsByClassName('togglable')].forEach((l) => {
    l.onclick = collapse;
});

function collapse({ target }) {
    target.parentNode.classList.toggle('open');
    target.parentNode.classList.toggle('closed');
}