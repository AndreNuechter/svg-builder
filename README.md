# svg-builder

A simple app to help with the creation of complex svgs.

## Getting started

Check out the [page](https://andrenuechter.github.io/svg-builder).

To try it out locally, clone the repo and initialize it via NPM.
Then just execute `npm run dev` and navigate to `localhost:3000`.

## Layers

Conceptually an svg - or let us say a drawing - produced by this app consists of a set of layers, each being represented by one of three svg elements - a path, a rect or an ellipse.
For the creation of each of those, there's a corresponding mode.

## Modes

Each of the layers making up a drawing has a mode - namely path, rect or ellipse.
The mode of a layer determines the svg element representing it and consequently how to define it.

### Path

A path is a set of curves, which are defined via commands.
To define a path, select the path mode, select the desired command (see below) and click on the canvas where it should be invoked (note that the first command of a path needs to be a `moveTo`/`M` command).
The points created this way may be adjusted by dragging the corresponding control points.

#### Path Commands

A subset of the path commands defined in the svg specification are available when in path mode (M, L, H, V, Q, S, C, T and A).
A command can be selected either by selecting it in the respective fieldset or pressing the corresponding letter on the keyboard.

### Rect

Rect mode enables the easy creation of rectangular shapes.
When in rect mode, create a rect by clicking on the canvas where its left upper corner should be and releasing the pointer where its lower right corner should be.
X- and y-position, as well as width or height can be adjusted via dragging the respective control points.

### Ellipse

In ellipse mode, it's easy to create circles and ellipses.
Just click on the spot on the canvas where the center of the ellipsoid should be and release the pointer once the proportions are satisfying.
The center, as well as x- and y-radii can be adjusted via dragging the respective control points.

## Transformations

Single layers can be translated by using the arrow keys.
The entire drawing may be translated by holding down ctrl while using the arrow keys.
Note that the canvas needs to be focused for translations to take place.

Other SVG transforms can be applied to the whole drawing or individual layers via the respectively labeled fieldset.

## Styling Layers

Adjust the styling of a layer via the "Fill & Stroke" titled fieldset.

## Using the Output

The final output can be previewed and downloaded in the tab labeled "Output".

The dimensions of the output canvas are set to maximize the available screen-real-estate, but the width and height of the output can be set independently here.
The viewBox of the output is initialized to the result of calling `getBBox()` on the entire drawing at the time, so that all of its content is visible (not accounting for transforms or control points, which are not taken into account by `getBBox()`).
The viewBox can be adjusted or re-centered and the preserve-aspect-ratio property can be defined here as well.