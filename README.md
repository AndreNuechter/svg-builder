# svg-builder

An app to help with the creation of complex svg markup that can be used directly in HTML or with a little fiddling in a [Path2d object](https://developer.mozilla.org/en-US/docs/Web/API/Path2D/Path2D).

__NOTE:__ The markupt is copied to the clip-board when double-clicking on the text, saying as much.

## Getting started

To try it out clone this repo and initialize it via NPM. Then execute eg `node app` and navigate to localhost:3000.

## Layers

Conceptually an svg, or let us say a drawing, produced by this app consists of layers, each being represented by one of three svg elements (path, rect or ellipse).

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

Rect mode enables the easy creation of rectangular shapes.
When in rect mode, create a rect by clicking on the canvas where its left upper corner should be and click again where its lower right corner should be.
X- and y-position, as well as width or height can be adjusted via dragging the respective control points.

### Ellipse

In ellipse mode, it's easy to create circles and ellipses.
Just click on the spot on the canvas where the center of the ellipsoid should be and click another time once the proportions are satisfying.

## Styling Layers

Adjust the styling of a layer via the "Fill & Stroke" titled fieldset.

## Transformations

An early version exists, but is broken. 
I'm meaning to use actual svg transforms eventually.

## Dimensions

Adjust the dimensions of the drawing via the "Dimensions" titled fieldset.

## Coming soon...

As this is work in progress, there're a couple of rough edges and missing features. 
Here I want to list a few things that might get added in the future:

- non-broken svg transformations
- import/export of projects
- a way to play with the viewBox attribute of the svg