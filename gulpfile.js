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

const htmlRoot = 'src/pug/index.pug';
const scssFiles = 'src/scss/*.scss';
const devDir = 'dev';
const deployDir = 'docs';
let target = devDir;

function html() {
    return src(htmlRoot)
        .pipe(pug())
        .pipe(dest(`${devDir}/`));
}

function htmlProd() {
    return src(htmlRoot)
        .pipe(pug())
        .pipe(htmlreplace({
            js: { src: './js/bundle.js', tpl: '<script src="%s" defer></script>' }
        }))
        .pipe(dest(`${deployDir}/`));
}

function css() {
    return src(scssFiles)
        .pipe(sass())
        .pipe(minifyCSS())
        .pipe(dest(`${target}/css`));
}

function js() {
    return src('src/js/**/*.js')
        .pipe(webpack(webpackConfig))
        .pipe(dest(`${deployDir}/js`));
}

function watchCSSAndHTML() {
    watch(scssFiles, css);
    watch('src/pug/*.pug', html);
}

function serve() {
    const app = express();
    app.use(express.static('src'));
    app.use(express.static(devDir));
    app.listen(3000, () => console.log('Build that SVG!'));
}

exports.default = parallel(html, css, serve, watchCSSAndHTML);
exports.bundle = parallel(htmlProd, (() => { target = deployDir; return css; })(), js);