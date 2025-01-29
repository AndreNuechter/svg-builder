export default (() => {
    const tabLinksContainer = document.getElementById('tab-links');
    const tabLinks = [...tabLinksContainer.children];
    const tabs = [...document.querySelectorAll('[data-tab-name]')];

    tabLinksContainer.addEventListener('click', ({ target }) => {
        if (!target.classList.contains('tab-link')) return;

        // destyle all tab-links, then style the one clicked
        tabLinks.forEach((t) => t.classList.remove('active'));
        target.classList.add('active');
        // hide all tabs, then show the one matching the clicked tab-link
        tabs.forEach((tab) => tab.classList.remove('active'));
        tabs.find((tab) => tab.dataset.tabName === target.dataset.linkedTab).classList.add('active');
    });
})();