export default (() => {
    const { body } = document;
    const tabsContainer = document.getElementById('tabs');
    const tabs = [...tabsContainer.children];
    const tabNames = ['drawing', 'output'];
    const setOrRestoreTab = () => {
        const hash = window.location.hash.slice(1);
        const tabName = tabNames.includes(hash) ? hash : tabNames[0];

        body.dataset.activeTab = tabName;
        document.querySelector(`a[data-tab-name="${tabName}"]`).click();

        if (tabName !== hash) {
            window.location.hash = tabName;
        }
    };

    window.addEventListener('DOMContentLoaded', setOrRestoreTab, { once: true });
    window.onhashchange = setOrRestoreTab;
    tabsContainer.onclick = ({ target }) => {
        if (!target.classList.contains('tab')) return;

        body.dataset.activeTab = target.dataset.tabName;
        tabs.forEach(t => t.classList.remove('active'));
        target.classList.add('active');
    };
})();