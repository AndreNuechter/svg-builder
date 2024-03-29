import { svg } from './dom-shared-elements.js';
import {
    configElement,
    drawShape,
    last,
    lastId,
    pointToMarkup,
} from './helper-functions.js';
import { arc, cube, quad } from './path-commands.js';

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

export default {
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
            points.push({ cx: x, cy: y });
            configElement(ellipse, points[0]);
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
        (session, points, x, y, mkControlPoint, remLastControlPoint) => {
            const lastPoint = last(points);

            // prevent using the same point multiple times in a row
            if (lastPoint && x === lastPoint.x && y === lastPoint.y) return;

            // ensure first point of a path is a moveTo command
            if (!points.length) session.cmd = 'M';

            // ensure there're no multiple consecutive M, V or H commands
            if (lastPoint && lastPoint.cmd === session.cmd && ['M', 'V', 'H'].includes(session.cmd)) {
                remLastControlPoint(points.pop().cmd);
            }

            points.push({ cmd: session.cmd, x, y });

            const additionalCPs = ((cmd) => {
                switch (cmd) {
                    case 'Q':
                    case 'S':
                        return quad(x, y, points[points.length - 2]);
                    case 'C':
                        return cube(x, y, points[points.length - 2]);
                    case 'A':
                        return arc(session.arcCmdConfig);
                    default:
                        return {};
                }
            })(session.cmd);
            Object.assign(last(points), additionalCPs);

            mkControlPoint(session.activeLayer, session.layerId)(last(points), lastId(points));
        },
        ({ points, closePath }) => ({
            d: `${points.map(pointToMarkup).join('')} ${closePath ? 'Z' : ''}`,
        }),
    ),
};

/**
 * @param { Function } mkPoint Executed when a point for this type of layer has been added. Configs the layers HTML, data and possibly session (the drawingShape bit).
 * @param { Function } geometryProps Exectuted when a layer of this type is drawn. Returns an object of geometry-props relevant for that type of layer paired w the respective layers config.
 * @returns {{ mkPoint: Function, geometryProps: Object }}
 */
function LayerType(mkPoint, geometryProps) {
    return { mkPoint, geometryProps };
}