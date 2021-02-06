const basicPathCmd = ({ x, y }) => `${x} ${y}`;
// A collection of functions that take a path-point and
// return a string tailored to the point's cmd that can be added to a path's d-attr
const pathCmds = {
    H: ({ x }) => x,
    V: ({ y }) => y,
    Q: ({ x, x1, y, y1 }) => `${x1} ${y1} ${x} ${y}`,
    C: ({
        x,
        x1,
        x2,
        y,
        y1,
        y2
    }) => `${x1} ${y1} ${x2} ${y2} ${x} ${y}`,
    A: ({
        x,
        xR,
        xRot,
        y,
        yR,
        large,
        sweep
    }) => `${xR} ${yR} ${xRot} ${large} ${sweep} ${x} ${y}`,
    S: ({ x, x1, y, y1 }) => `${x1} ${y1} ${x} ${y}`,
    T: basicPathCmd,
    M: basicPathCmd,
    L: basicPathCmd
};
const offset = 33;
const calculateOffset = (distA, distB, prior, current) => {
    if (distA < distB) {
        return prior > current ? -offset : offset;
    }
    return 0;
};
const cmdControlPointDefaults = (xEnd, yEnd, xPrev, yPrev) => {
    const distX = Math.abs(xPrev - xEnd);
    const distY = Math.abs(yPrev - yEnd);
    const xMin = Math.min(xEnd, xPrev);
    const yMin = Math.min(yEnd, yPrev);
    const yOffset = calculateOffset(distY, distX, xPrev, xEnd);
    const xOffset = calculateOffset(distX, distY, yPrev, yEnd);

    return {
        xMin,
        yMin,
        yOffset,
        xOffset
    };
};

export {
    arc,
    cube,
    pathCmds,
    quad
};

/**
 * Returns basic defaults for a point of the arc-cmd.
 * @param { Object } config The current configuration of the arc-cmd-config fieldset.
 * @returns { Object }
 */
function arc(config) {
    return {
        xR: config.xR,
        yR: config.yR,
        xRot: config.xRot,
        large: +config.large,
        sweep: +config.sweep
    };
}

/**
 * Returns a set of somewhat ok default coords for the cps of a cube cmd.
 * @param { number } xEnd The x-coordinate of the cmd.
 * @param { number } yEnd The y-coordinate of the cmd.
 * @param { Object } { x: xPrev, y: yPrev } X- and y-ccordinates of the previous point.
 * @returns { Object }
 */
function cube(xEnd, yEnd, { x: xPrev, y: yPrev }) {
    const {
        xMin,
        yMin,
        yOffset,
        xOffset
    } = cmdControlPointDefaults(xEnd, yEnd, xPrev, yPrev);

    return {
        x1: xMin - xOffset + (Math.max(xEnd, xPrev) - xMin) * 0.25,
        y1: yMin - yOffset + (Math.max(yEnd, yPrev) - yMin) * 0.25,
        x2: xMin - xOffset + (Math.max(xEnd, xPrev) - xMin) * 0.75,
        y2: yMin - yOffset + (Math.max(yEnd, yPrev) - yMin) * 0.75
    };
}

/**
 * Returns a set of somewhat ok default coords for the cps of a quad cmd.
 * @param { number } xEnd The x-coordinate of the cmd.
 * @param { number } yEnd The y-coordinate of the cmd.
 * @param { Object } { x: xPrev, y: yPrev } X- and y-ccordinates of the previous point.
 * @returns { Object }
 */
function quad(xEnd, yEnd, { x: xPrev, y: yPrev }) {
    const {
        xMin,
        yMin,
        yOffset,
        xOffset
    } = cmdControlPointDefaults(xEnd, yEnd, xPrev, yPrev);

    return {
        x1: xMin - xOffset + (Math.max(xEnd, xPrev) - xMin) * 0.5,
        y1: yMin - yOffset + (Math.max(yEnd, yPrev) - yMin) * 0.5
    };
}