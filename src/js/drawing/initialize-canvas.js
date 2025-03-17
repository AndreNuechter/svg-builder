import { defaults } from '../constants';
import { updateControlPoints } from '../control-points/control-point-handling';
import { svgTemplates } from '../dom-creations';
import {
    drawingContent,
    drawingTitle,
    layers,
    layerSelect,
    layerSelectors,
    pathClosingToggle,
    transformTargetSwitch,
    vacancyMsgStyle
} from '../dom-selections';
import { configClone, pointToMarkup } from '../helper-functions';
import { addLayerSelector } from '../layers/layer-handling';
import drawing from './drawing';
import session from '../session';
import { setActiveLayerConfig, setCmdConfig } from '../layers/active-layer-config';
import { applyTransforms, setTransformsConfig, stringifyTransforms } from '../transform-handling';
import { setOutputConfig } from '../output-handling';
import { setFillAndStrokeConfig } from '../fill-and-stroke-handling';

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
            return configClone(
                shape,
                {
                    'data-layer-id': index,
                    ...layer.style,
                    ...geometryProps,
                    transform: stringifyTransforms(layer.transforms),
                }
            );
        })
    );
    // rm and create cps
    updateControlPoints(session);
    // rm layerselectors
    layerSelect.replaceChildren();
    // create layerselectors
    drawing.layers.forEach((_, index) => addLayerSelector(index));

    // possibly check the active layer's selector
    // NOTE: this is a quickfix for undoing a deletion
    if (session.layerId === -1 && layers.length > 0) {
        session.layerId = 0;
        layerSelectors[session.layerId].checked = true;
    }

    // hide or show the no-layer message
    vacancyMsgStyle.display = layers.length > 0
        ? 'none'
        : 'initial';

    // set the mode
    session.mode = session.activeLayer?.mode;

    // config the rest of the ui
    pathClosingToggle.checked = session.activeLayer?.closePath;
    drawingTitle.textContent = drawing.name || 'Unnamed drawing';
    transformTargetSwitch.checked = session.transformLayerNotDrawing;
    setCmdConfig(session);
    applyTransforms(drawing, session);
    setActiveLayerConfig();
    setTransformsConfig(session.transformTarget);
    setFillAndStrokeConfig(session.activeLayer?.style || defaults.style);
    setOutputConfig(drawing);
}