# svg-builder

A simple app to help with the creation of complex svg markup.

## Getting started

To try it out clone this repo and initialize it via NPM. Then execute `gulp` and navigate to localhost:3000.

## Layers

Conceptually an svg - or let us say a drawing - produced by this app consists of a set of layers, each being represented by one of three svg elements - a path, a rect or an ellipse.

Layers can be selected on the left via a set of radio inputs.
They may be re-ordered via dragging those radio inputs up or down (technically the wrapping label-element).
Furthermore they can be given custom labels by double-clicking on the respective label and typing in the desired label.

Layers can be added by clicking the respectively labeled button, by clicking on the canvas or by changing the mode on an existing layer, if it has content.

Layers may be deleted one at a time or all at once via the appropriately named buttons on the left.

A single point (or in case or rects or ellipses the entire shape) may be erased by hitting backspace or the respectively labeled button.

## Modes

Each of the layers making up a drawing has a mode - namely path, rect or ellipse.
The mode of a layer determines the svg element representing it and consequently how to define it.

### Path

A path is probably the most complex svg element.
Paths are sets of curves, which are defined via commands.
To define a path, select an appropriate command (see below) and click on the canvas where it should be invoked (the first command of a path needs to be a moveTo command).
The thusly created points may be adjusted by dragging the corresponding control points.

#### Commands

A subset of the path commands defined in the svg specification are available when in path mode (M, L, H, V, Q, S, C, T and A).
When in path mode, a command can be selectet either by selecting it in the respective fieldset or pressing the corresponding letter on the keyboard.

### Rect

Rect mode enables the easy creation of rectangular shapes.
When in rect mode, create a rect by clicking on the canvas where its left upper corner should be and click again where its lower right corner should be.
X- and y-position, as well as width or height can be adjusted via dragging the respective control points.

### Ellipse

In ellipse mode, it's easy to create circles and ellipses.
Just click on the spot on the canvas where the center of the ellipsoid should be and click another time once the proportions are satisfying.
The center, as well as x- and y-radii can be adjusted via dragging the respective control points.

## Styling Layers

Adjust the styling of a layer via the "Fill & Stroke" titled fieldset.

## Transformations

Single layers can be translated by using the arrow keys.
The entire drawing may be translated by holding down ctrl while using the arrow keys.

Other SVG transforms can also be applied to the whole drawing or individual layers via the respectively labeled fieldset.

## The Output

The final output can be previewed in the tab labeled Output.

The dimensions of the canvas are set to maximize the available screen-real-estate, but the width and height of the output can be set independently here.
The viewBox of the output is initialized to the result of calling `getBBox()` on the entire drawing at the time, so that all of its content is visible (not accounting for transforms or control points, which are not taken into account by `getBBox()`).
The viewBox can be adjusted or re-centered and the preserve-aspect-ratio property can be defined here as well.

Clicking on the appropriately labeled button will copy the current mark-up to the clipboard.
It can also be gotten as a data uri or downloaded directly.