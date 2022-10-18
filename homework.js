var canvas;
var gl;

var maxNumTriangles = 200;  
var maxNumVertices  = 3 * maxNumTriangles;
var index = 0;

// Menu indices
var controlIndex = 0;
var colorIndex = 0;

var polygons = [];

var polygonStart = false;
var clickPosition;

var vertexArray = [];
var colorArray = [];

var vertexBuffer;
var colorBuffer;

var stateHistory = [];
var stateIndex = null;

function getClickPosition(event) {
	return vec2(2 * event.clientX / canvas.width - 1, 2 * (canvas.height - event.clientY) / canvas.height - 1);
}

function getUniqueColor() {
	// Create a color for the color array
	var certainty = 0.1;
	var colorCount = (1 + certainty);
	var red = (polygons.length - 1) * certainty;
	var green = Math.floor(red / colorCount) * certainty;
	var blue = Math.floor(green / colorCount) * certainty;

	vertex = vec4(red % colorCount, green % colorCount, blue % colorCount, 1.0);

	// Add the unique color to the color array
	colorArray[polygons.length - 1] = vertex;
}

function addColorToBuffer(color, vertexCount = 1) {
	let vertexColors = [];
	for (let i = 0; i < vertexCount; i++) {
		vertexColors.push(color);
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(vertexColors));
}

function addVertexToBuffer(vertex) {
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(vertex));
}

function createRectangle(event) {
	let rectangle = new Rectangle(clickPosition, getClickPosition(event), vec4(colors[colorIndex]));
	polygons.push(rectangle);

	addColorToBuffer(rectangle.color, 4);
	addVertexToBuffer(rectangle.vertices);
	index += 4;

	addNewState();
	render();
}

function createTriangle(event) {
	let triangle = new Triangle(clickPosition, getClickPosition(event), vec4(colors[colorIndex]));
	polygons.push(triangle);

	addColorToBuffer(triangle.color, 3);
	addVertexToBuffer(triangle.vertices);
	index += 3;

	addNewState();
	render();
}

function completePolygon() {
	if (polygonStart) {
		// Remove the last elements from the polygon array if any other option is chosen
		// Decrease the index so that the last vertices do not count, only if 2 vertices are specified
		if (polygons[polygons.length - 1].vertices.length < 3) {
			index -= polygons[polygons.length - 1].vertices.length;

			// Remove the last polygon from polygons
			polygons.pop();
		}

		polygonStart = false;
		addNewState();
		render();
	}
}

function addPolygonVertex(event) {
	var vertex;

	// If only the first vertex of the polygon/shape is determined
	if (!polygonStart) {
		polygons.push(new Polygon([], vec4(colors[colorIndex])));
		polygonStart = true;

		getUniqueColor();
	}

	// Bind the color buffer to send color data to GPU
	addColorToBuffer(polygons[polygons.length - 1].color);

	// Obtain the vertex
	vertex = getClickPosition(event);
	polygons[polygons.length - 1].addVertex(vertex);

	// Bind the vertex buffer to send vertex data to GPU
	addVertexToBuffer(vertex);

	console.log(vertex);
	/**
	 // Fill the vertex array
	 vertexArray[index] = vertex;

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
	index++;

	render();
}

function addNewState() {
	let currentState = new SceneState(index, vertexArray, colorArray, polygons);
	let currentStateData = JSON.stringify(currentState);

	if (stateIndex == null) {
		stateHistory = [currentStateData];
		stateIndex = 0;
		return;
	}

	// Remove the latest states until the current state
	for (let i = 0; i < stateHistory.length - 1 - stateIndex; i++) {
		stateHistory.pop();
	}

	// Remove the oldest state if there are 5 states
	if (stateHistory.length === 5) {
		stateHistory.shift();
	}

	// Add the current state
	stateHistory.push(currentStateData);
	stateIndex = stateHistory.length - 1;
}

function undo() {
	if(stateIndex === 0)
		return;

	// Deep copy the previous state and change the program values to the copy's values
	stateIndex--;
	let currentState = JSON.parse(stateHistory[stateIndex]);

	index = currentState.index;
	vertexArray = currentState.vertexArray;
	colorArray = currentState.colorArray;
	polygons = currentState.polygons;

	render();
}

function redo() {
	if(stateIndex === 4)
		return;

	stateIndex++;
	let currentState = JSON.parse(stateHistory[stateIndex]);

	index = currentState.index;
	vertexArray = currentState.vertexArray;
	colorArray = currentState.colorArray;
	polygons = currentState.polygons;

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

		switch (controlIndex) {
			case UNDO:
				undo();
				break;
			case REDO:
				redo();
				break;
			default:
				break;
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
			// Rectangle draw mode
			case DRAW_RECTANGLE:
			case DRAW_TRIANGLE:
				clickPosition = getClickPosition(event);
				break;
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
    });

	// Mouseup
	canvas.addEventListener("mouseup", function(event) {
		switch (controlIndex) {
			// Rectangle draw mode
			case DRAW_RECTANGLE:
				createRectangle(event);
				break;
			case DRAW_TRIANGLE:
				createTriangle(event);
				break;
			default:
				break;
		}
	});

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
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);
	
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

	addNewState();
}

function render() {
    // Clear the canvas (with grey) to redraw everything
    gl.clear(gl.COLOR_BUFFER_BIT);

	// Drawing each polygon
	let startIndex = 0;
    for(var i = 0; i < polygons.length; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, startIndex, polygons[i].vertices.length);
		startIndex += polygons[i].vertices.length;
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