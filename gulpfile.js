const {
    src,
    dest,
    parallel,
    watch
} = require('gulp');
const pug = require('gulp-pug');
const sass = require('gulp-sass');
const minifyCSS = require('gulp-csso');
const express = require('express');

function html() {
    return src('src/pug/*.pug')
        .pipe(pug())
        .pipe(dest('dist/'));
}

function css() {
    return src('src/css/*.scss')
        .pipe(sass())
        .pipe(minifyCSS())
        .pipe(dest('dist/css'));
}

// TODO: fill this in...should concat, minify/uglify and move to dist
function js() {

}

// TODO do this in default?
function watcher() {
    watch('src/css/*.scss', css);
    watch('src/pug/*.pug', html);
}

function serveForDev() {
    const app = express();
    app.use(express.static('src'));
    app.use(express.static('dist'));
    // TODO: get rid of empty func
    app.get('/', () => {

    });
    app.listen(3000,
        () => console.log('Build that SVG!'));
}

function serve() {
    const app = express();
    app.use(express.static('dist'));
    // TODO: get rid of empty func
    app.get('/', () => {

    });
    app.listen(3000);
}

exports.default = parallel(html, css, serveForDev, watcher);
exports.production = parallel(html, css, js, serve);