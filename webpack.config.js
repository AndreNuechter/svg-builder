const path = require('path');

module.exports = {
    entry: [
        path.join(__dirname, '/src/js/index.js'),
        path.join(__dirname, '/src/js/components/coords-display.js'),
        path.join(__dirname, '/src/js/components/collapsable-fieldsets.js')
    ],
    output: {
        filename: 'bundle.js',
        path: path.join(__dirname, '/dist')
    }
};