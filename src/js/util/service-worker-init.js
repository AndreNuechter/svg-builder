export default (() => {
    window.addEventListener('DOMContentLoaded', () => {
        if ('serviceWorker' in window.navigator) {
            window.navigator.serviceWorker
                .register('./service-worker.js');
        }
    }, { once: true });
})();