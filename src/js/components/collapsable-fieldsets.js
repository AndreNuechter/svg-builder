export default (() => window.addEventListener('load', () => {
    document.querySelectorAll('.collapsable').forEach((fieldset) => {
        const legend = fieldset.firstElementChild;

        legend.innerHTML = `${legend.textContent} <svg class="icon"><use href="#arrow"></use></svg>`;

        legend.addEventListener('click', toggleFieldset);
    });

    function toggleFieldset({ currentTarget: { parentElement: fieldset } }) {
        fieldset.classList.toggle('open');
    }
}, { once: true }))();