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
const htmlreplace = require('gulp-html-replace');
const webpack = require('webpack-stream');
const webpackConfig = require('./webpack.config.js');

function html() {
    return src('src/pug/index.pug')
        .pipe(pug())
        .pipe(dest('docs/'));
}

function htmlProd() {
    return src('src/pug/index.pug')
        .pipe(pug())
        .pipe(htmlreplace({
            js: { src: './js/bundle.js', tpl: '<script src="%s" defer></script>' }
        }))
        .pipe(dest('docs/'));
}

function css() {
    return src('src/scss/*.scss')
        .pipe(sass())
        .pipe(minifyCSS())
        .pipe(dest('docs/css'));
}

function js() {
    return src('src/js/**/*.js')
        .pipe(webpack(webpackConfig))
        .pipe(dest('docs/js'));
}

function watchCSSAndHTML() {
    watch('src/scss/*.scss', css);
    watch('src/pug/*.pug', html);
}

function serveForDev() {
    const app = express();
    app.use(express.static('src'));
    app.use(express.static('docs'));
    app.listen(3000, () => console.log('Build that SVG!'));
}

function serve() {
    const app = express();
    app.use(express.static('docs'));
    app.listen(3000);
}

exports.default = parallel(html, css, serveForDev, watchCSSAndHTML);
exports.production = parallel(htmlProd, css, js, serve);