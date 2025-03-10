import { controlPointContainer } from '../dom-selections';
import { getSVGCoords } from '../helper-functions';
import session from '../session';
import { drawLayer, styleLayer } from './layer-handling';
import { addLayer } from './layer-handling';
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

    // enable dragging the new point wo having to release the pointer
    const createdPoint = session.mode === 'path'
        ? controlPointContainer.lastElementChild
        : controlPointContainer.firstElementChild;

    createdPoint.dispatchEvent(new Event('pointerdown'));

    styleLayer(session.layerId);
    drawLayer(session.layerId);
}