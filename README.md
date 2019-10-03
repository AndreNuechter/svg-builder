# svg-builder

An app to help with the creation of complex svg markup.

## Getting started

To try it out clone this repo and initialize it via NPM. Then execute eg `node app` and navigate to localhost:3000.

## Layers

Conceptually an svg, or let us say a drawing, produced by this app consists of a set of layers, each being represented by one of three svg elements (path, rect or ellipse).

Layers are organized on the left in a set of radio inputs.
They may be re-ordered via dragging those radio inputs up or down (technically the wrapping label-element).
Furthermore they can be given custom labels by double-clicking on the respective label and typing in the desired string.

Layers can be added by clicking on the canvas or by changing the mode on an existing layer, if it has content.

Layers may be deleted one at a time or all at once via the appropriately named buttons on the left.

A single point (or in case or rects or ellipses the entire shape) maybe erased by hitting backspace.

## Modes

Each of the layers making up a drawing has a mode, namely path, rect or ellipse.
The mode of a layer determines the svg element representing it and consequently how to define it.

### Path

A path is probably the most complex svg element.
Paths are sets of curves, which are defined via commands.
To define a path, select an appropriate command and click on the canvas where it should be invoked (the first command of a path needs to be a moveTo command).
The thusly created points may be adjusted by dragging the corresponding control points.

#### Commands

A subset of the path commands defined in the svg specification are available when in path mode (M, L, H, V, Q, C and A).
When in path mode, a command can be selectet either by selecting it in the respective fieldset or pressing the corresponding letter on the keyboard.

### Rect

Rect mode enables easy creation of rectangular shapes.
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

There're somewhat broken transform-functions to target single layers.
The entire drawing may be transformed using svg-transforms, which can be defined via the respective fieldset.

## Dimensions

The dimension of the canvas try to maximize available screen-real-estate.

The dimensions of the output (viewport and viewbox) may be controlled via the fielset titled "Output".