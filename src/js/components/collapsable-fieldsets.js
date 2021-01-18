window.addEventListener('load', () => {
    const collapse = ({ target: { parentElement: fieldset } }) => {
        const wasOpen = fieldset.classList.contains('open');
        fieldset.classList.toggle('open');
        fieldset.classList.toggle('closed');
        fieldset.style.height = wasOpen ? '' : fieldset.dataset.height;
    };

    [...document.getElementsByClassName('togglable')].forEach((f) => {
        f.dataset.height = `${f.offsetHeight}px`;
        // clicking on the legend triggers the collapse
        f.firstElementChild.onclick = collapse;

        if (!f.classList.contains('open') && !f.classList.contains('closed')) f.classList.add('closed');
    });
});