/* globals document */

(() => {
    const collapse = ({ target: { parentElement: { classList: c } } }) => {
        c.toggle('open');
        c.toggle('closed');
    };

    [...document.getElementsByClassName('togglable')].forEach((f) => {
        // clicking on the legend triggers the collapse
        f.firstElementChild.onclick = collapse;

        if (!f.classList.contains('open') && !f.classList.contains('closed')) f.classList.add('open');
    });
})();