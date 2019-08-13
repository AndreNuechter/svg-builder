// TODO: for quad and cube, return objects that can be inserted directly
// TODO: can we abstract the creation of a cp?

/**
 * Returns somewhat ok default coords for a cp for the quad cmd.
 * @param { Array } end An array containing x- and y-coordinates of the cmds target.
 * @param { Object } prior The prior point of the layer (we only care about its x- and y-coords).
 * @returns { Object }
 */
function quad(end, prior) {
    const [x, y] = end;
    const distX = Math.abs(prior.x - x);
    const distY = Math.abs(prior.y - y);
    const xMin = Math.min(x, prior.x);
    const yMin = Math.min(y, prior.y);
    let yOffset;
    let xOffset;

    // TODO: what is the 35 for?
    // TODO: set up helper func for this
    if (distX < distY) {
        yOffset = prior.y > y ? -35 : 35;
    } else { yOffset = 0; }

    if (distY < distX) {
        xOffset = prior.x > x ? -35 : 35;
    } else { xOffset = 0; }

    return {
        x: xMin - xOffset + (Math.max(x, prior.x) - xMin) / 2,
        y: yMin - yOffset + (Math.max(y, prior.y) - yMin) / 2
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
    let yOffset;
    let xOffset;

    if (distY < distX) {
        yOffset = prior.x > x ? -35 : 35;
    } else { yOffset = 0; }

    if (distX < distY) {
        xOffset = prior.y > y ? -35 : 35;
    } else { xOffset = 0; }

    const cp1 = {
        x: xMin - xOffset + (Math.max(x, prior.x) - xMin) / 4,
        y: yMin - yOffset + (Math.max(y, prior.y) - yMin) / 4
    };
    const cp2 = {
        x: xMin - xOffset + (Math.max(x, prior.x) - xMin) * 0.75,
        y: yMin - yOffset + (Math.max(y, prior.y) - yMin) * 0.75
    };

    return [cp1, cp2];
}

function arc() {
    // TODO: decide x- and y-radii (how do these work anyhow? isn't it based on distance?), and large-arc and sweep flags...how to attach points to change those?
}

export {
    quad,
    cube,
    arc
};