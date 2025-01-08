export default (() => window.addEventListener('load', () => {
    const toggleState = ({ target: { parentElement: fieldset } }) => {
        fieldset.classList.toggle('open');
    };

    document.querySelectorAll('.togglable').forEach((fieldset) => {
        // clicking on the legend opens or closes the fieldset
        fieldset.firstElementChild.onclick = toggleState;
    });
}, { once: true }))();