// TODO: can we abstract the creation of a cp?

// TODO: what is the 35 for?
const calculateOffset = (distA, distB, prior, current) => {
    if (distA < distB) {
        return prior > current ? -35 : 35;
    }
    return 0;
};

/**
 * Returns somewhat ok default coords for a cp for the quad cmd.
 * @param { Array } end An array containing x- and y-coordinates of the cmds target.
 * @param { Object } prior The prior point of the layer (we only care about its x- and y-coords).
 * @returns { Object }
 */
function quad(end, prior) { // TODO: return object that may be assigned directly
    const [x, y] = end;
    const distX = Math.abs(prior.x - x);
    const distY = Math.abs(prior.y - y);
    const xMin = Math.min(x, prior.x);
    const yMin = Math.min(y, prior.y);
    const yOffset = calculateOffset(distX, distY, prior.y, y);
    const xOffset = calculateOffset(distY, distX, prior.x, x);

    return {
        x1: xMin - xOffset + (Math.max(x, prior.x) - xMin) / 2,
        y1: yMin - yOffset + (Math.max(y, prior.y) - yMin) / 2
    };
}

/**
 * Returns a set of somewhat ok default coords for the cps for the cube cmd.
 * @param { Array } end An array containing x- and y-coordinates of the cmds target.
 * @param { Object } prior The prior point of the layer (we only care about its x- and y-coords).
 * @returns { Object }
 */
function cube(end, prior) {
    const [x, y] = end;
    const distX = Math.abs(prior.x - x);
    const distY = Math.abs(prior.y - y);
    const xMin = Math.min(x, prior.x);
    const yMin = Math.min(y, prior.y);
    const yOffset = calculateOffset(distY, distX, prior.x, x);
    const xOffset = calculateOffset(distX, distY, prior.y, y);

    return {
        x1: xMin - xOffset + (Math.max(x, prior.x) - xMin) / 4,
        y1: yMin - yOffset + (Math.max(y, prior.y) - yMin) / 4,
        x2: xMin - xOffset + (Math.max(x, prior.x) - xMin) * 0.75,
        y2: yMin - yOffset + (Math.max(y, prior.y) - yMin) * 0.75
    };
}

function arc(config) {
    // TODO: rethink defaults
    // decide x- and y-radii (how do these work anyhow? isn't it based on distance?), and large-arc and sweep flags...how to attach points to change those?
    return {
        xR: config.xR,
        yR: config.yR,
        xRot: config.xRot,
        large: +config.large,
        sweep: +config.sweep
    };
}

export {
    quad,
    cube,
    arc
};