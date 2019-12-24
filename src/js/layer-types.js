import { layers, svg } from './dom-shared-elements.js';
import { configElement, drawShape, pointToMarkup } from './helper-functions.js';
import { arc, cube, quad } from './path-commands.js';
import { defaults } from './constants.js';

const layerTypes = {
    rect: LayerType((session, points, x, y) => {
        if (points[0]) return;

        const rect = layers[session.layer];
        points.push({ x, y });
        configElement(rect, points[0]);
        session.drawingShape = true;
        Object.assign(session.shapeStart, { x, y });

        svg.onpointermove = drawShape(rect, (x1, y1) => ({
            x: Math.min(x, x1),
            y: Math.min(y, y1),
            width: Math.abs(x - x1),
            height: Math.abs(y - y1)
        }));
    }, ({ points: [point] }) => ({
        x: point.x,
        y: point.y,
        width: point.width || 0,
        height: point.height || 0
    })),
    ellipse: LayerType((session, points, x, y) => {
        if (points[0]) return;

        const ellipse = layers[session.layer];
        points.push({ cx: x, cy: y });
        configElement(ellipse, points[0]);
        session.drawingShape = true;
        Object.assign(session.shapeStart, { x, y });

        svg.onpointermove = drawShape(ellipse, (x1, y1) => ({
            rx: Math.abs(x - x1),
            ry: Math.abs(y - y1)
        }));
    }, ({ points: [point] }) => ({
        cx: point.cx,
        cy: point.cy,
        rx: point.rx || 0,
        ry: point.ry || 0
    })),
    path: LayerType((session, points, x, y, mkControlPoint, remLastControlPoint) => {
        const lastPoint = points[points.length - 1];

        // prevent using the same point multiple times in a row
        if (lastPoint && x === lastPoint.x && y === lastPoint.y) return;

        // ensure first point of a path is a moveTo command
        if (!points.length) session.cmd = 'M';

        // ensure there're no multiple consecutive M, V or H commands
        if (lastPoint && lastPoint.cmd === session.cmd && ['M', 'V', 'H'].includes(session.cmd)) {
            remLastControlPoint(points.pop().cmd);
        }

        points.push({ cmd: session.cmd, x, y });

        // for Q, C and A cmds we need to add cp(s)
        if (session.cmd === 'Q' || session.cmd === 'S') {
            const cp = quad(x, y, points[points.length - 2]);
            Object.assign(points[points.length - 1], cp);
        } else if (session.cmd === 'C') {
            const cps = cube(x, y, points[points.length - 2]);
            Object.assign(points[points.length - 1], cps);
        } else if (session.cmd === 'A') {
            const cp = arc(Object.assign({}, defaults.arcCmdConfig, session.arcCmdConfig));
            Object.assign(points[points.length - 1], cp);
        }

        // create cp(s) for the new point
        mkControlPoint(session.current, session.layer)(points[points.length - 1], points.length - 1);
    }, layer => ({ d: layer.points.map(pointToMarkup).join('') + (layer.closePath ? 'Z' : '') }))
};

function LayerType(mkPoint, geometryProps) { return { mkPoint, geometryProps }; }

export default layerTypes;