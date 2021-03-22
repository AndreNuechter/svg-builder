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
const gulpEsbuild = require('gulp-esbuild');

const htmlRoot = 'src/pug/index.pug';
const style = 'src/scss/style.scss';
const devDir = 'dev';
const deployDir = 'docs';

exports.default = parallel(html, css, serve, watchCSSAndHTML);
exports.bundle = parallel(htmlProd, cssProd, js);

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
    return src(style)
        .pipe(sass())
        .pipe(minifyCSS())
        .pipe(dest(`${devDir}/css`));
}

function cssProd() {
    return src(style)
        .pipe(sass())
        .pipe(minifyCSS())
        .pipe(dest(`${deployDir}/css`));
}

function js() {
    return src('./src/js/index.js')
        .pipe(gulpEsbuild({
            outfile: 'bundle.js',
            bundle: true,
            minify: true
        }))
        .pipe(dest(`${deployDir}/js`));
}

function watchCSSAndHTML() {
    watch('src/scss/*.scss', css);
    watch('src/pug/*.pug', html);
}

function serve() {
    const app = express();
    app.use(express.static('src'));
    app.use(express.static(devDir));
    // eslint-disable-next-line no-console
    app.listen(3001, () => console.log('Build that SVG!'));
}