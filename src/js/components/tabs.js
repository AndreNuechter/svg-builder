import { centerViewBox } from '../user-actions';

export default (() => {
    const tabLinksContainer = document.getElementById('tab-links');
    const tabLinks = [...tabLinksContainer.children];
    const tabs = [
        {
            id: 'project-selection',
            element: document.querySelector('[data-tab="project-selection"]'),
        },
        {
            id: 'drawing',
            element: document.querySelector('[data-tab="drawing"]'),
        },
        {
            id: 'output',
            element: document.querySelector('[data-tab="output"]'),
        }
    ];
    let enteredOutputTabBefore = false;

    tabLinksContainer.onclick = ({ target }) => {
        if (!target.classList.contains('tab-link')) return;

        // destyle all tab-links, then style the one clicked
        tabLinks.forEach((t) => t.classList.remove('active'));
        target.classList.add('active');
        // hide all tabs, then show the one matching the clicked tab-link
        tabs.forEach((tab) => tab.element.classList.remove('active'));
        tabs.find(({ id }) => id === target.dataset.tabName).element.classList.add('active');
        // set viewBox to boundingBox, when entering output tab for the first time
        if (target.dataset.tabName === 'output' && !enteredOutputTabBefore) {
            enteredOutputTabBefore = true;
            centerViewBox();
        }
    };
})();