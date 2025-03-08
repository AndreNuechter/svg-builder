import { controlPointContainer } from '../dom-selections';
import { getSVGCoords } from '../helper-functions';
import session from '../session';
import { drawLayer, styleLayer } from './layer-handling';
import { addLayer } from './layer-management';
import layerTypes from './layer-types';

export default function addPoint(event) {
    if (!session.activeLayer) addLayer();

    const [x, y] = getSVGCoords(event);
    const { points } = session.activeLayer;

    layerTypes[session.mode]
        .mkPoint(
            session,
            points,
            x,
            y
        );

    // enable dragging the newly created path-point wo having to release the pointer
    if (session.mode === 'path') {
        controlPointContainer.lastElementChild.dispatchEvent(new Event('pointerdown'));
    }

    styleLayer(session.layerId);
    drawLayer(session.layerId);
}