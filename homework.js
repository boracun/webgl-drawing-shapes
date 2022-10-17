var canvas;
var gl;

var maxNumTriangles = 200;  
var maxNumVertices  = 3 * maxNumTriangles;
var index = 0;

// Menu indices
var controlIndex = 0;
var colorIndex = 0;

var t;
var c;
var numPolygons = 0;
var numIndices = [];
numIndices[0] = 0;
var start = [0];

var polygonStart = false;

var color = new Uint8Array(4);

var vertexArray = [];
var colorArray = [];

var vertexBuffer;
var colorBuffer;

var DRAW_RECTANGLE = 0;
var DRAW_TRIANGLE = 1;
var CREATE_POLYGON = 2;
var MOVE_OBJECT = 3;
var REMOVE_OBJECT = 4;
var ROTATE_OBJECT = 5;
var UNDO = 6;
var REDO = 7;
var ZOOM = 8;
var SAVE_SCENE = 9;
var LOAD_SCENE = 10;

// 8 predefined colors
var colors = [
	vec4( 0.0, 0.0, 0.0, 1.0 ), // black
	vec4( 1.0, 0.0, 0.0, 1.0 ), // red
	vec4( 1.0, 1.0, 0.0, 1.0 ), // yellow
	vec4( 0.0, 1.0, 0.0, 1.0 ), // green
	vec4( 0.0, 1.0, 1.0, 1.0 ), // cyan
	vec4( 0.0, 0.0, 1.0, 1.0 ), // blue
	vec4( 1.0, 0.0, 1.0, 1.0 ), // magenta
	vec4( 1.0, 1.0, 1.0, 1.0 ) // white
];

function completePolygon() {
	if (polygonStart) {
		// Remove the last elements from the polygon array if any other option is chosen
		// Decrease the index so that the last vertices do not count, only if 2 vertices are specified
		if (numIndices[numPolygons - 1] < 3) {
			index -= numIndices[numPolygons-1];

			// Assign the count of vertices of the last polygon to 0
			numIndices[numPolygons - 1] = 0;

			// Decrease the number of polygons
			numPolygons--;
		}

		// If the given vertices specifies a polygon, only end the drawing process of that polygon
		else {
			numIndices[numPolygons] = 0;
			start[numPolygons] = index;
		}

		polygonStart = false;
		render();
	}
}

function addPolygonVertex(event) {
	// If only the first vertex of the polygon/shape is determined
	if (!polygonStart) {
		numPolygons++;
		polygonStart = true;

		// Obtain the color of the index
		c = vec4(colors[colorIndex]);

		// Create a color for the color array
		var certainty = 0.1;
		var colorCount = (1 + certainty);
		var red = (numPolygons - 1) * certainty;
		var green = Math.floor( red / colorCount ) * certainty;
		var blue = Math.floor( green / colorCount ) * certainty;

		t = vec4(red % colorCount, green % colorCount, blue % colorCount, 1.0);

		// Add the unique color to the color array
		colorArray[numPolygons - 1] = t;
	}

	// Bind the color buffer to send color data to GPU
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(c));

	// Obtain the vertex
	t = vec2(2 * event.clientX / canvas.width - 1,
		2 * (canvas.height - event.clientY) / canvas.height - 1);

	// Bind the vertex buffer to send vertex data to GPU
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(t));

	console.log(t);
	/**
	 // Fill the vertex array
	 vertexArray[index] = t;

	 // Obtain the starting and ending vertices to create a convex polygon
	 var startIndex = index - numIndices[numPolygons-1];
	 var endIndex = index;

	 var vertexCount = numIndices[numPolygons-1] + 1;
	 var convexVertices = createConvexPolygon(vertexArray[startIndex, endIndex], vertexCount);

	 // Bind the vertex buffer to send vertex data to GPU
	 gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );

	 console.log(vertexArray[0][0]);
	 console.log(vertexArray[0][1]);

	 for ( var count = 0; count < vertexCount; count++ )
	 {
				var inorderVertex = vec2(convexVertices[count][0], convexVertices[count][1]);
				console.log(inorderVertex);
				gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index - vertexCount + count), flatten(inorderVertex));
			}
	 */

	// Increasing the count of vertices corresponding to the current polygon
	numIndices[numPolygons-1]++;
	index++;

	render();
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }
    
	// Control and color menus
	var controlMenu = document.getElementById("Controls");
	var colorMenu = document.getElementById("Colors");
    
    // Obtain the selections from the menus
	controlMenu.addEventListener("click", function() {
    	controlIndex = controlMenu.selectedIndex;

	   // The drawing process of a polygon was not done but another option is chosen
		if (controlIndex != CREATE_POLYGON) {
			completePolygon();
		}
	});
	
	colorMenu.addEventListener("click", function() {
       colorIndex = colorMenu.selectedIndex;
	});

	var endPolygonButton = document.getElementById("end-polygon-button")
    endPolygonButton.addEventListener("click", function(){
		// If the button is clicked, then end the polygon drawing process
		completePolygon();
    });

	// Mousedown
    canvas.addEventListener("mousedown", function(event) {
		switch (controlIndex) {
			// If an object is wanted to be created
			case CREATE_POLYGON:
				addPolygonVertex(event);
				break;
			// If an object is wanted to be selected
			case REMOVE_OBJECT:
			case ROTATE_OBJECT:
				break;
			default:
				break;
		}
    } );

	/*
	// Used only for moving an object
	canvas.addEventListener("mousemove", function(event){
		if ( controlIndex == MOVE_OBJECT )
		{}
      }

    } );
	*/

    gl.viewport( 0, 0, canvas.width, canvas.height );
	
    // Determine the clear color (light grey)
	gl.clearColor(0.9, 0.9, 0.9, 1.0);
	
    // Clear the canvas (with grey)
	gl.clear(gl.COLOR_BUFFER_BIT);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
	// Creating the vertex buffer and binding it
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW);
	
	
    var vPos = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPos);
    
	// Creating the color buffer and binding it
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW);
	
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}

function render() {
    // Clear the canvas (with grey) to redraw everything
    gl.clear( gl.COLOR_BUFFER_BIT );

	// Drawing each polygon
    for(var i = 0; i < numPolygons; i++) {
        gl.drawArrays(gl.LINE_LOOP, start[i], numIndices[i]);
    }
}
/*
function createConvexPolygon(vertices, length)
{
	//for (var i = 0; i < length; i++)
		//console.log(vertices[i]);
	
	return vertices;
}
*/