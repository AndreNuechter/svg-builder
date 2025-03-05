import { defaults } from '../constants';
import { updateControlPoints } from '../control-points/control-point-handling';
import { svgTemplates } from '../dom-creations';
import {
    drawingContent,
    drawingTitle,
    pathClosingToggle,
    transformTargetSwitch
} from '../dom-selections';
import {
    setCmdConfig,
    setFillAndStrokeConfig,
    setOutputConfig,
    setTransformsConfig
} from '../form-handling';
import { applyTransforms, configClone, pointToMarkup, stringifyTransforms } from '../helper-functions';
import { addLayerSelector, deleteLayerSelectors } from '../layers/layer-management';
import drawing from './drawing';
import session from '../session';
import { setActiveLayerConfig } from '../layers/active-layer-config';

export default initializeCanvas;

/** Set up the contents of the drawing tab. */
function initializeCanvas() {
    // clear and re-populate the svg canvas
    drawingContent.replaceChildren(
        ...drawing.layers.map((layer, index) => {
            // determine the svg element representing this layer
            const shape = svgTemplates[layer.mode];
            // determine its geometry props
            const geometryProps = layer.mode === 'path'
                ? {
                    d: `${layer.points.map(pointToMarkup).join(' ')}${layer.closePath
                        ? 'Z'
                        : ''}`,
                }
                : layer.points[0] || {};

            // return a configured svg element representing this layer
            return configClone(shape)({
                'data-layer-id': index,
                ...layer.style,
                ...geometryProps,
                transform: stringifyTransforms(layer.transforms),
            });
        })
    );
    // rm and create cps
    updateControlPoints(session);
    // rm layerselectors
    deleteLayerSelectors();
    // create layerselectors
    drawing.layers.forEach((_, index) => addLayerSelector(index));
    // config the rest of the ui
    pathClosingToggle.checked = session.activeLayer && session.activeLayer.closePath;
    drawingTitle.textContent = drawing.name || 'Unnamed drawing';
    transformTargetSwitch.checked = session.transformLayerNotDrawing;
    setCmdConfig(session);
    applyTransforms(drawing, session);
    setActiveLayerConfig();
    setTransformsConfig(session.transformTarget);
    setFillAndStrokeConfig(session.activeLayer?.style || defaults.style);
    setOutputConfig(drawing);
}