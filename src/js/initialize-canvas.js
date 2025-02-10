import { defaults } from './constants';
import { createControlPoints, remControlPoints } from './control-points/control-point-handling';
import { svgTemplates } from './dom-created-elements';
import {
    drawingContent,
    drawingTitle,
    layers,
    pathClosingToggle,
    transformTargetSwitch
} from './dom-shared-elements';
import {
    setArcCmdConfig,
    setCmdConfig,
    setFillAndStrokeConfig,
    setOutputConfig,
    setTransformsConfig
} from './form-handling';
import { applyTransforms, configClone, pointToMarkup, stringifyTransforms } from './helper-functions';
import { addLayerSelector, deleteLayerSelectors } from './layers/layer-management';
import drawing from './drawing/drawing';
import session from './session';
import { setActiveLayerConfig } from './layers/active-layer-config';

window.addEventListener('DOMContentLoaded', initializeCanvas, { once: true });
document.addEventListener('initializeCanvas', initializeCanvas);

/** Completely set up the contents of the drawing tab. */
function initializeCanvas() {
    // clear canvas
    remControlPoints();
    [...layers].forEach((layer) => layer.remove());
    deleteLayerSelectors();
    // populate canvas
    createControlPoints(session);
    drawingContent.append(...drawing.layers.map((layer, i) => {
        const shape = svgTemplates[layer.mode];
        const geometryProps = (layer.mode === 'path')
            ? {
                d: `${layer.points.map(pointToMarkup).join(' ')}${layer.closePath
                    ? 'Z'
                    : ''}`,
            }
            : layer.points[0] || {};
        return configClone(shape)({
            'data-layer-id': i,
            ...layer.style,
            ...geometryProps,
            transform: stringifyTransforms(layer.transforms),
        });
    }));
    // adjust ui-elements
    drawing.layers.forEach((_, index) => addLayerSelector(index));
    pathClosingToggle.checked = session.activeLayer && session.activeLayer.closePath;
    setCmdConfig(session);
    applyTransforms(drawing, session);
    setActiveLayerConfig();
    setTransformsConfig(session.transformTarget);
    transformTargetSwitch.checked = session.transformLayerNotDrawing;
    setFillAndStrokeConfig(session.activeLayer?.style || defaults.style);
    setArcCmdConfig(session);
    setOutputConfig(drawing);
    drawingTitle.textContent = drawing.name || 'Unnamed drawing';
}