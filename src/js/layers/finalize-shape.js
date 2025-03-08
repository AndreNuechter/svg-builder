import { mkControlPoints } from '../control-points/control-point-handling';
import { svg } from '../dom-selections';
import { save } from '../drawing/drawing';
import { getSVGCoords, last, lastId } from '../helper-functions';
import session from '../session';
import { setActiveLayerConfig } from './active-layer-config';

/** Finalize drawing a rect or ellipse, which started by adding a point to the active layer. */
export default function finalizeShape(event) {
    if (!session.drawingShape) return;

    session.drawingShape = false;

    const [x, y] = getSVGCoords(event);
    const { points = [] } = session.activeLayer;
    const size = {
        width: Math.abs(session.shapeStart.x - x),
        height: Math.abs(session.shapeStart.y - y),
    };

    Object.assign(points[0], session.mode === 'rect'
        ? {
            x: Math.min(session.shapeStart.x, x),
            y: Math.min(session.shapeStart.y, y),
            width: size.width,
            height: size.height,
        }
        : {
            rx: size.width,
            ry: size.height,
        });
    save('drawShape');
    setActiveLayerConfig();
    mkControlPoints(
        session.activeLayer,
        session.layerId,
        last(points),
        lastId(points)
    );
    svg.onpointermove = null;
}