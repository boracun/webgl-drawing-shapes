# cs465_homework1
21802838, 21703437

Instructions:
To draw rectangles or equilateral triangles: Pick a color, choose the appropriate drawing mode, click on the canvas, drag your mouse, and release. Do not leave the canvas when drawing.

To draw a polygon: Choose the "Create Polygon" mode. Click on the canvas to add a vertex. To create convex polygons, add the vertices in either clockwise or counterclockwise order.

To move an object: Choose the "Move Object" mode. Click on the object you want to move, drag the distance, and release.

To remove an object: Choose the "Remove Object" mode and simply click on it.

To rotate an object: Choose the "Rotate Object" mode, enter a rotation degree (not radians) into the rotation input, then click on the object. Please note that the positive degrees rotate the object counterclockwise, the negative degrees rotate the object clockwise.

To undo/redo an operation: Simply click on the "undo" or "redo" options. The operations that supports undo/redo are the following: Finalizing drawing rectangles, triangles, and polygons; moving, removing, or rotating an object; pasting selection. Note that loading a scene resets the history.

To zoom in/out: Choose the "Zoom in/out" mode. Left-click anywhere on the canvas to zoom in on that mouse position. Right-click anywhere on the canvas to zoom out of that mouse position.

To move around in the scene: Choose the "Move Around" mode. Click on the canvas, drag your mouse, and release to move the scene the drag distance.

To save the current scene: Click on the "Save Scene" option. A scene file should be downloaded to your computer. To avoid browser-related problems, please use Google Chrome.

To load a scene: Use the "Choose File" button to choose a file from your computer. Then click the "Load Scene" option. Make sure that the file uploaded is a JSON file in the same format as the downloaded files. To avoid browser-related problems, please use Google Chrome.

To copy and paste a group of objects: Choose the "Copy Selection" option, click on the canvas, drag your mouse, and release. Your click and release positions will create a diagonal for an imaginary rectangle. Each object whose every vertex falls within this rectangle is copied. Then, choose the "Paste Selection" option and click anywhere on the canvas. The selected shapes will be pasted such that the geometric center of the shapes is on the click position.
