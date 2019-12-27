/* globals window, document */

(() => {
    const activeTab = window.location.hash.slice(1);
    const { body } = document;
    const tabsContainer = document.getElementById('tabs');
    const tabs = [...tabsContainer.children];
    const tabNames = ['drawing', 'output'];

    // ensure a tab is selected on start
    window.addEventListener('DOMContentLoaded',
        () => selectTab(tabNames.includes(activeTab) ? activeTab : tabNames[0]));

    tabsContainer.onclick = ({ target }) => {
        if (!target.classList.contains('tab')) return;

        body.dataset.activeTab = target.dataset.tabName;
        tabs.forEach(t => t.classList.remove('active'));
        target.classList.add('active');
    };

    function selectTab(tabName) {
        window.location.hash = tabName;
        body.dataset.activeTab = tabName;
        document.querySelector(`a[data-tab-name="${tabName}"]`).click();
    }
})();