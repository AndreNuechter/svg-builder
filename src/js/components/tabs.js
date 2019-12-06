/* globals window, document */

(() => {
    const activeTab = window.location.hash.slice(1);
    const { body } = document;
    const tabContainer = document.getElementById('tabs');
    const tabs = [...tabContainer.children];
    const tabNames = ['drawing', 'output'];

    // ensure a tab is selected on start
    window.addEventListener('DOMContentLoaded',
        () => selectTab(tabNames.includes(activeTab) ? activeTab : tabNames[0]));

    tabContainer.onclick = ({ target }) => {
        const el = target.closest('.tab');

        if (!el) return;

        body.dataset.activeTab = el.dataset.tabName;
        tabs.forEach(t => t.classList.remove('active'));
        el.classList.add('active');
    };

    function selectTab(tabName) {
        window.location.hash = tabName;
        body.dataset.activeTab = tabName;
        document.querySelector(`a[data-tab-name="${tabName}"]`).click();
    }
})();