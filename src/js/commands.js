// gives the ordered properties of a point of a cmd
const pathCmds = {
    H: ({ x }) => [x],
    V: ({ y }) => [y],
    Q: p => [p.x1, p.y1, p.x, p.y],
    C: p => [
        p.x1,
        p.y1,
        p.x2,
        p.y2,
        p.x,
        p.y
    ],
    A: p => [
        p.xR,
        p.yR,
        p.xRot,
        p.large,
        p.sweep,
        p.x,
        p.y
    ],
    M: ({ x, y }) => [x, y],
    L: ({ x, y }) => [x, y]
};

// TODO: stay DRY...abstract the creation of a cp
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

function cmdControlPointDefaults(xEnd, yEnd, xPrev, yPrev) {
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
}

const offset = 33;

function calculateOffset(distA, distB, prior, current) {
    if (distA < distB) {
        return prior > current ? -offset : offset;
    }
    return 0;
}

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

export {
    pathCmds,
    quad,
    cube,
    arc
};