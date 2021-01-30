window.addEventListener('load', () => {
    const collapse = ({ target: { parentElement: fieldset } }) => {
        fieldset.classList.toggle('closed');
        fieldset.classList.toggle('open');
    };

    [...document.getElementsByClassName('togglable')].forEach((f) => {
        // clicking on the legend triggers the collapse
        f.firstElementChild.onclick = collapse;

        if (!f.classList.contains('open') && !f.classList.contains('closed')) f.classList.add('closed');
    });
});