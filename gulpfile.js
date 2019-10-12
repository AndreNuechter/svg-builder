const {
    src,
    dest,
    parallel,
    watch
} = require('gulp');
const pug = require('gulp-pug');
const less = require('gulp-sass');
const minifyCSS = require('gulp-csso');
const express = require('express');

function html() {
    return src('src/pug/*.pug')
        .pipe(pug())
        .pipe(dest('dist/'));
}

function css() {
    return src('src/css/*.scss')
        .pipe(less())
        .pipe(minifyCSS())
        .pipe(dest('dist/css'));
}

// TODO: fill this in and add to default...watcher too...do we want to concat+minify/uglify?
function js() {

}

// TODO do this in default?
function watcher() {
    watch('src/css/*.scss', css);
    watch('src/pug/*.pug', html);
}

function serve() {
    const app = express();
    app.use(express.static('dist'));
    // TODO: get rid of empty func
    app.get('/', () => {

    });

    app.listen(3000,
        () => console.log('Build that SVG!'));
}

exports.css = css;
exports.html = html;
exports.serve = serve;
exports.default = parallel(html, css, serve, watcher);