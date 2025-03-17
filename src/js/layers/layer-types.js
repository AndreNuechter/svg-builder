import { mkControlPoints, remLastControlPoint } from '../control-points/control-point-handling.js';
import { save } from '../drawing/drawing.js';
import {
    configElement,
    last,
    lastId,
    pointToMarkup,
} from '../helper-functions.js';
import { setActiveLayerConfig } from './active-layer-config.js';
import { cmdsThatShouldNotRepeat, mkDefaultPoint } from './path-commands.js';

const defaults = { rect: 100, ellipse: 50 };
const layerTypes = {
    rect: LayerType(
        (session, points, x, y) => {
            if (points[0]) return;

            const rect = session.activeSVGElement;
            const newPoint = {
                x,
                y,
                width: defaults.rect,
                height: defaults.rect,
                rx: 0,
                ry: 0
            };

            drawShape(points, newPoint, rect, session);
        },
        ({ points: [point] }) => ({
            x: point.x,
            y: point.y,
            width: point.width || defaults.rect,
            height: point.height || defaults.rect,
        }),
    ),
    ellipse: LayerType(
        (session, points, x, y) => {
            if (points[0]) return;

            const ellipse = session.activeSVGElement;
            const newPoint = { cx: x, cy: y, rx: defaults.ellipse, ry: defaults.ellipse };

            drawShape(points, newPoint, ellipse, session);
        },
        ({ points: [point] }) => ({
            cx: point.cx,
            cy: point.cy,
            rx: point.rx || defaults.ellipse,
            ry: point.ry || defaults.ellipse,
        }),
    ),
    path: LayerType(
        (session, points, x, y) => {
            const lastPoint = last(points);

            // prevent using the same point multiple times in a row
            if (lastPoint?.x === x && lastPoint?.y === y) return;

            // ensure the first command of a path is a moveTo
            if (lastPoint === undefined) session.cmd = 'M';

            // prevent consecutive M, V or H commands
            if (lastPoint?.cmd === session.cmd && cmdsThatShouldNotRepeat.has(session.cmd)) {
                points.pop();
                remLastControlPoint(lastPoint.cmd);
            }

            // NOTE: because V and H dont have both x and y components,
            // one may be undefined causing invalid values for the cps of the next cmd
            // which is why we then look at the point before that
            const lastPointData = (({ cmd }) => {
                switch (cmd) {
                    case 'V':
                        return { y: lastPoint.y, x: points[lastId(points) - 1].x };
                    case 'H':
                        return { x: lastPoint.x, y: points[lastId(points) - 1].y };
                    default:
                        return lastPoint;
                }
            })(lastPoint);

            const newPoint = Object.assign({ cmd: session.cmd }, mkDefaultPoint(session.cmd, x, y, lastPointData));

            points.push(newPoint);
            mkControlPoints(session.activeLayer, session.layerId, newPoint, lastId(points));
        },
        ({ points, closePath }) => ({
            d: `${points.map(pointToMarkup).join('')}${closePath ? ' Z' : ''}`,
        }),
    ),
};

export default layerTypes;

/**
 * @param { Function } mkPoint Executed when a point for this type of layer has been added.
 * Configs the layers HTML and data.
 * @param { Function } geometryProps Exectuted when a layer of this type is drawn.
 * Returns an object of geometry-props relevant for that type of layer paired w the respective layers config.
 * @returns {{ mkPoint: Function, geometryProps: Function }}
 */
function LayerType(mkPoint, geometryProps) {
    return { mkPoint, geometryProps };
}

function drawShape(points, data, shape, session) {
    points.push(data);
    configElement(shape, data);
    save('drawShape');
    setActiveLayerConfig();
    mkControlPoints(
        session.activeLayer,
        session.layerId,
        last(points),
        lastId(points)
    );
}