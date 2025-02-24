import { mkControlPoints, remLastControlPoint } from '../control-points/control-point-handling.js';
import { svg } from '../dom-shared-elements.js';
import {
    configElement,
    drawShape,
    last,
    lastId,
    pointToMarkup,
} from '../helper-functions.js';
import { cmdsThatShouldNotRepeat, cmdsWithCpsDependingOnThePreviousCmd, mkDefaultPoint } from './path-commands.js';

const shaperFuncs = {
    rect: (x, y) => (x1, y1) => ({
        x: Math.min(x, x1),
        y: Math.min(y, y1),
        width: Math.abs(x - x1),
        height: Math.abs(y - y1),
    }),
    ellipse: (x, y) => (x1, y1) => ({
        rx: Math.abs(x - x1),
        ry: Math.abs(y - y1),
    }),
};
const layerTypes = {
    rect: LayerType(
        (session, points, x, y) => {
            if (points[0]) return;

            const rect = session.activeSVGElement;
            points.push({ x, y });
            configElement(rect, points[0]);
            session.drawingShape = true;
            Object.assign(session.shapeStart, { x, y });
            svg.onpointermove = drawShape(rect, shaperFuncs.rect(x, y));
        },
        ({ points: [point] }) => ({
            x: point.x,
            y: point.y,
            width: point.width || 0,
            height: point.height || 0,
        }),
    ),
    ellipse: LayerType(
        (session, points, x, y) => {
            if (points[0]) return;

            const ellipse = session.activeSVGElement;
            const newPoint = { cx: x, cy: y };

            points.push(newPoint);
            configElement(ellipse, newPoint);
            session.drawingShape = true;
            Object.assign(session.shapeStart, { x, y });
            svg.onpointermove = drawShape(ellipse, shaperFuncs.ellipse(x, y));
        },
        ({ points: [point] }) => ({
            cx: point.cx,
            cy: point.cy,
            rx: point.rx || 0,
            ry: point.ry || 0,
        }),
    ),
    path: LayerType(
        (session, points, x, y) => {
            const lastPoint = last(points);
            let lastPointData;

            // prevent using the same point multiple times in a row
            if (lastPoint?.x === x && lastPoint?.y === y) return;

            // ensure first command of a path is a moveTo
            if (!points.length) session.cmd = 'M';

            // prevent consecutive M, V or H commands
            if (lastPoint?.cmd === session.cmd && cmdsThatShouldNotRepeat.has(session.cmd)) {
                points.pop();
                remLastControlPoint(lastPoint.cmd);
            }

            // NOTE: because V and H dont have both x and y components,
            // one may be undefined causing invalid values for the cps of the next cmd
            // which is why we then look at the point before that
            if (cmdsWithCpsDependingOnThePreviousCmd.has(session.cmd)) {
                lastPointData = (({ cmd }) => {
                    switch (cmd) {
                        case 'V':
                            return { y: lastPoint.y, x: points[lastId(points) - 1].x };
                        case 'H':
                            return { x: lastPoint.x, y: points[lastId(points) - 1].y };
                        default:
                            return lastPoint;
                    }
                })(lastPoint);
            }

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
 * Configs the layers HTML, data and possibly session (the drawingShape bit).
 * @param { Function } geometryProps Exectuted when a layer of this type is drawn.
 * Returns an object of geometry-props relevant for that type of layer paired w the respective layers config.
 * @returns {{ mkPoint: Function, geometryProps: Function }}
 */
function LayerType(mkPoint, geometryProps) {
    return { mkPoint, geometryProps };
}