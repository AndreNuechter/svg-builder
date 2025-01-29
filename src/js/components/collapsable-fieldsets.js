export default (() => window.addEventListener('load', () => {
    document.querySelectorAll('.togglable').forEach((fieldset) => {
        // clicking on the <legend> opens or closes the fieldset
        fieldset.firstElementChild.addEventListener('click', toggleFieldset);
    });

    function toggleFieldset({ target: { parentElement: fieldset } }) {
        fieldset.classList.toggle('open');
    }
}, { once: true }))();