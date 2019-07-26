const express = require('express');
const pug = require('pug');
const sass = require('node-sass-middleware');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(
    sass({
        src: __dirname,
        dest: path.join(__dirname, '/static'),
        debug: true
    })
);

app.use(express.static('static'));

fs.writeFile(
    path.join(__dirname, '/static/index.html'),
    pug.renderFile(path.join(__dirname, '/pug/index.pug')),
    (err) => {
        if (err) throw err;
    }
);

app.get('/', (req, res) => {
    /* res.send(
      pug.renderFile(path.join(__dirname, '/pug/index.pug'), { cache: true })
    ); */
});

app.listen(port,
    () => console.log('Build that SVG!'));