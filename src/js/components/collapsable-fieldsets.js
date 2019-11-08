/* globals document */

(() => {
    [...document.getElementsByClassName('togglable')].forEach((f) => {
        f.firstElementChild.onclick = collapse;

        if (!f.classList.contains('open') && !f.classList.contains('closed')) f.classList.add('open');
    });

    function collapse({ target }) {
        target.parentElement.classList.toggle('open');
        target.parentElement.classList.toggle('closed');
    }
})();