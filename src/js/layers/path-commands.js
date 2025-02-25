/** A collection of functions that take a path-point and return a string tailored to the point's cmd that can be added to a path's d-attr. */
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
        y2,
    }) => `${x1} ${y1} ${x2} ${y2} ${x} ${y}`,
    A: ({
        x,
        xR,
        xRot,
        y,
        yR,
        large,
        sweep,
    }) => `${xR} ${yR} ${xRot} ${Number(large)} ${Number(sweep)} ${x} ${y}`,
    S: ({ x, x1, y, y1 }) => `${x1} ${y1} ${x} ${y}`,
    T: basicPathCmd,
    M: basicPathCmd,
    L: basicPathCmd,
};
const cmdTags = new Set(Object.keys(pathCmds));
const cmdsThatShouldNotRepeat = new Set(['M', 'V', 'H']);
const cmdsWithCpsDependingOnThePreviousCmd = new Set(['Q', 'S', 'C']);

export default pathCmds;
export {
    cmdTags,
    cmdsThatShouldNotRepeat,
    cmdsWithCpsDependingOnThePreviousCmd,
    mkDefaultPoint,
};

function basicPathCmd({ x, y }) {
    return `${x} ${y}`;
}

function calculateOffset(distA, distB, prior, current) {
    const offset = 33;

    if (distA < distB) {
        return prior > current ? -offset : offset;
    }

    return 0;
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
        xOffset,
    };
}

/**
 * Returns a set of somewhat ok default coords for the cps of a cube cmd.
 * @param { number } xEnd The x-coordinate of the cmd.
 * @param { number } yEnd The y-coordinate of the cmd.
 * @param { Object } { x: xPrev, y: yPrev } X- and y-coordinates of the previous point.
 * @returns { Object }
 */
function cube(xEnd, yEnd, { x: xPrev, y: yPrev }) {
    const {
        xMin,
        yMin,
        yOffset,
        xOffset,
    } = cmdControlPointDefaults(xEnd, yEnd, xPrev, yPrev);

    return {
        x1: xMin - xOffset + (Math.max(xEnd, xPrev) - xMin) * 0.25,
        y1: yMin - yOffset + (Math.max(yEnd, yPrev) - yMin) * 0.25,
        x2: xMin - xOffset + (Math.max(xEnd, xPrev) - xMin) * 0.75,
        y2: yMin - yOffset + (Math.max(yEnd, yPrev) - yMin) * 0.75,
    };
}

function mkDefaultPoint(cmd, x, y, previousPointData) {
    switch (cmd) {
        case 'M':
        case 'L':
        case 'T':
            return { x, y };
        case 'V':
            return { y };
        case 'H':
            return { x };
        case 'Q':
        case 'S':
            return { x, y, ...quad(x, y, previousPointData) };
        case 'C':
            return { x, y, ...cube(x, y, previousPointData) };
        case 'A':
            return {
                x,
                y,
                xR: '50',
                yR: '50',
                xRot: '0',
                large: false,
                sweep: false
            };
    }
}

/**
 * Returns a set of somewhat ok default coords for the cps of a quad cmd.
 * @param { number } xEnd The x-coordinate of the cmd.
 * @param { number } yEnd The y-coordinate of the cmd.
 * @param { Object } { x: xPrev, y: yPrev } X- and y-coordinates of the previous point.
 * @returns { Object }
 */
function quad(xEnd, yEnd, { x: xPrev, y: yPrev }) {
    const {
        xMin,
        yMin,
        yOffset,
        xOffset,
    } = cmdControlPointDefaults(xEnd, yEnd, xPrev, yPrev);

    return {
        x1: xMin - xOffset + (Math.max(xEnd, xPrev) - xMin) * 0.5,
        y1: yMin - yOffset + (Math.max(yEnd, yPrev) - yMin) * 0.5,
    };
}