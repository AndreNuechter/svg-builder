export default (() => {
    const tabLinksContainer = document.getElementById('tab-links');
    const tabLinks = [...tabLinksContainer.children];
    const tabs = [{
        id: 'drawing',
        element: document.querySelector('[data-tab="drawing"]'),
    }, {
        id: 'output',
        element: document.querySelector('[data-tab="output"]'),
    }];

    tabLinksContainer.onclick = ({ target }) => {
        if (!target.classList.contains('tab-link')) return;

        // destyle all tab-links, then style the one clicked
        tabLinks.forEach((t) => t.classList.remove('active'));
        target.classList.add('active');
        // hide all tabs, then show the one matching the clicked tab-link
        tabs.forEach((tab) => tab.element.classList.remove('active'));
        tabs.find(({ id }) => id === target.dataset.tabName).element.classList.add('active');
    };
})();