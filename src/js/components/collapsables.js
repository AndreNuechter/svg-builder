/* globals document */

[...document.getElementsByClassName('togglable')].forEach((f) => {
    f.firstChild.onclick = collapse;
});

function collapse({ target }) {
    target.parentNode.classList.toggle('open');
    target.parentNode.classList.toggle('closed');
}