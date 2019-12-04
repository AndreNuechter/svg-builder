/* globals window, document */

(() => {
    const tabContainer = document.getElementById('tabs');
    const tabs = [...tabContainer.children];
    const tabNames = ['drawing', 'output'];
    const activeTab = window.location.hash.slice(1);

    // NOTE: ensure there's exactly one active tab on start
    tabs.forEach(t => t.classList.remove('active'));

    // NOTE: ensure a tab is selected
    if (activeTab && tabNames.includes(activeTab)) {
        selectTab(activeTab);
    } else {
        selectTab(tabNames[0]);
    }

    function selectTab(tabName) {
        window.location.hash = tabName;
        document.body.dataset.activeTab = tabName;
        document.querySelector(`[data-tab-name="${tabName}"`).classList.add('active');
    }

    tabContainer.onclick = (e) => {
        const el = e.target.closest('a');

        if (!el) return;

        document.body.dataset.activeTab = el.dataset.tabName;

        // NOTE: force browser to repaint to prevent "lingering" elements...duz not work really:(
        document.body.style.display = 'none';
        document.body.offsetHeight;
        document.body.style.display = '';

        tabs.forEach(t => t.classList.remove('active'));
        el.classList.add('active');
    };
})();