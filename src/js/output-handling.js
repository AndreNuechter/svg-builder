import { optimize } from 'svgo';
import { canvas, downloadLink, dummyImg } from './dom-creations';
import { drawingContent, outputConfig, preview } from './dom-selections';
import drawing, { save } from './drawing/drawing';
import { configElement, configForm, stringifyTransforms } from './helper-functions';

const ctx = canvas.getContext('2d');
const layerIdRe = / data-layer-id="\d+"/g;
const multiSpaces = /\s{2,}/g;
const { elements: outputConfigFields } = outputConfig;
let enteredOutputTabBefore = false;
let dummyImageIsSetUp = false;

export {
    centerViewBox,
    configOutput,
    copyDataURIToClipboard,
    copyMarkupToClipboard,
    triggerDownload,
    switchToOutputTab,
};

function centerViewBox() {
    const {
        x,
        y,
        width,
        height,
    } = drawingContent.getBBox();

    Object.assign(drawing.outputConfig, {
        'vb-min-x': Math.trunc(x).toString(),
        'vb-min-y': Math.trunc(y).toString(),
        'vb-width': Math.trunc(width).toString(),
        'vb-height': Math.trunc(height).toString(),
    });

    updateViewBox();
    setOutputConfig(drawing);
    save('centerVB');
}

function configOutput({ target: { name, value } }) {
    drawing.outputConfig[name] = value;
    updateViewBox();
    save('configOutput');
}

function copyDataURIToClipboard() {
    writeToClipboard(generateDataURI());
}

function copyMarkupToClipboard() {
    writeToClipboard(generateMarkUp());
}

function download(url) {
    Object.assign(downloadLink, {
        // TODO use drawing title if it is set
        download: `My_SVG.${drawing.outputConfig['file-format']}`,
        href: url,
    });
    downloadLink.click();
}

function generateDataURI() {
    return `data:image/svg+xml,${generateMarkUp()
        .replace(/"/g, "'")}`
        .replace(/#/g, '%23');
}

/**
 * Returns the markup of the created drawing (wo the cps) inside default svg markup.
 */
function generateMarkUp() {
    return optimize(`<svg xmlns="http://www.w3.org/2000/svg" 
    width="${drawing.outputConfig.width}" 
    height="${drawing.outputConfig.height}" 
    viewBox="${getDrawingVBox()}" 
    preserveAspectRatio="${`${drawing.outputConfig.ratio} ${drawing.outputConfig['slice-or-meet']}`}">
    <g transform="${stringifyTransforms(drawing.transforms)}">${drawingContent.innerHTML}</g></svg>`
        .replace(layerIdRe, '')
        .replace(multiSpaces, ' ')).data;
}

function getDrawingVBox() {
    return [
        drawing.outputConfig['vb-min-x'],
        drawing.outputConfig['vb-min-y'],
        drawing.outputConfig['vb-width'],
        drawing.outputConfig['vb-height'],
    ];
}

/**
 * Adjusts the Output configuration fieldset to a given config.
 * @param { Object } conf The config for the output. Expected to be gotten from `drawing`.
 */
function setOutputConfig({ outputConfig: conf }) {
    configForm(outputConfigFields, conf);
}

function switchToOutputTab() {
    preview.innerHTML = generateMarkUp();
    if (getDrawingVBox().every((v) => v === 0)) centerViewBox();
    // set viewBox to boundingBox, when entering output tab for the first time
    if (!enteredOutputTabBefore) {
        enteredOutputTabBefore = true;
        centerViewBox();
    }
}

function triggerDownload() {
    const svgDataURI = generateDataURI();

    if (drawing.outputConfig['file-format'] === 'svg') {
        download(svgDataURI);
    } else {
        dummyImg.src = svgDataURI;

        if (dummyImageIsSetUp) return;

        dummyImageIsSetUp = true;

        dummyImg.addEventListener('load', () => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            Object.assign(ctx.canvas, {
                width: drawing.outputConfig.width,
                height: drawing.outputConfig.height,
            });
            ctx.drawImage(dummyImg, 0, 0);
            download(canvas.toDataURL());
        });
    }
}

function updateViewBox() {
    configElement(preview.firstElementChild, {
        width: drawing.outputConfig.width,
        height: drawing.outputConfig.height,
        viewBox: getDrawingVBox(),
        preserveAspectRatio: `${drawing.outputConfig.ratio} ${drawing.outputConfig['slice-or-meet']}`,
    });
}

function writeToClipboard(text) {
    window.navigator.clipboard.writeText(text);
}