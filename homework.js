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

<<<<<<< Updated upstream
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
=======
var vertexArray = [];
var colorArray = [];

var vertexBuffer;
var colorBuffer;
var transformationMatrixLocation;

var stateHistory = [];
var stateIndex = null;

var selected = [];
const branchAngle = Math.PI;

var uploadedJson;

var SCALE_CONSTANT = vec3(0.2, 0.2, 0);
var scaleAmount = vec3(1, 1, 0);

var translationAmount = vec3(0, 0, 0);

// Careful: This array's first element is always the position where the area selection started
var copiedPolygons = [];

function getClickPosition(event, offset = vec2(0, 0)) {
	let xComponent = 2 * event.clientX / canvas.width - 1;
	let yComponent = 2 * (canvas.height - event.clientY) / canvas.height - 1;

	xComponent /= scaleAmount[0];
	yComponent /= scaleAmount[0];

	let result = vec2(xComponent, yComponent);
	result = subtract(result, vec2(translationAmount[0], translationAmount[1]));
	result = add(result, offset);

	return result;
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
		else {
			calculateEnclosingRectangle(polygons[polygons.length - 1]);
			addNewState();
		}

		polygonStart = false;
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
	//addVertexToBuffer(vertex);

	//console.log(vertex);
	
	 // Obtain the vertex
			
			// Fill the vertex array		
			vertexArray[index] = vertex;
			
			// Obtain the starting and ending vertices, and the vertex count to create a convex polygon
			var startIndex = vertexArray.length - polygons[polygons.length - 1].vertices.length;
			var endIndex = index + 1; // do not include
			var vertexCount = polygons[polygons.length - 1].vertices.length;			
			
			var deepCopyVertexArray = [];
			for ( var i = startIndex; i < endIndex; i++)
				deepCopyVertexArray[i - startIndex] = vertexArray[i];
			
			// Obtain the convex polygon with given vertices
			var convexVertices = createConvexPolygon(deepCopyVertexArray);
			
			// Bind the vertex buffer to send the corrected vertices data to GPU
			gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
			
			for ( var count = 0; count < vertexCount; count++ )
			{
				gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index - vertexCount + count + 1), flatten(convexVertices[count]));
			}
			
			//gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));
			// Increasing the count of vertices corresponding to the current polygon
			numIndices[polygons.length-1]++;
			index++;
			
			for (var i = 0; i < vertexCount; i++)
				vertexArray[index - vertexCount + i] = convexVertices[i];
			
			polygons[polygons.length - 1].vertices = convexVertices;
			
			//console.log(vertexArray);
	 
	//index++;

	render();
}

// Careful: The polygon passed must be referring to the polygons array element since the comparison is done with ==
function translatePolygon(polygon, event, customOffset = null, addNewStateAfter = true) {
	let positionDiff;

	if (event !== null) {
		let position2 = getClickPosition(event);
		positionDiff = subtract(position2, clickPosition);
	}
	else {
		positionDiff = customOffset;
	}

	for (let i = 0; i < polygon.vertices.length; i++) {
		polygon.vertices[i] = add(polygon.vertices[i], positionDiff);
	}

	polygons.splice(polygons.indexOf(polygon), 1);	// Remove this polygon from polygons
	polygons.push(polygon);	// Add it to the end

	calculateEnclosingRectangle(polygon);

	if (addNewStateAfter) {
		addNewState();
		loadState(stateHistory[stateIndex], true);
	}
}

// Careful: The polygon passed must be referring to the polygons array element since the comparison is done with ==
function remove(polygon) {
	let elementIndex = polygons.indexOf(polygon);
	
	// Remove that element
	if ( elementIndex == -1 )
		return;

	polygons.splice(elementIndex, 1);
	addNewState();
	loadState(stateHistory[stateIndex], true);
}
>>>>>>> Stashed changes

var color = new Uint8Array(4);

var vertexArray = [];
var colorArray = [];

//varying vec4 color;

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

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
	// Control and color menus
	var controlMenu = document.getElementById("Controls");
	var colorMenu = document.getElementById("Colors");
    
    // Obtain the selections from the menus
	controlMenu.addEventListener("click", function() {
    controlIndex = controlMenu.selectedIndex;
	   
	   // The drawing process of a polygon was not done but another option is chosen
		if (controlIndex != CREATE_POLYGON && polygonStart) {
			// Remove the last elements from the polygon array if any other option is chosen
			// Decrease the index so that the last vertices do not count, only if 2 vertices are specified
			if ( numIndices[numPolygons-1] < 3 )
			{
				index -= numIndices[numPolygons-1];
						
				// Assign the count of vertices of the last polygon to 0
				numIndices[numPolygons-1] = 0;
						
				// Decrease the number of polygons
				numPolygons--;
			}
			
			// If the given vertices specifies a polygon, only end the drawing process of that polygon
			else
			{
				numIndices[numPolygons] = 0;
				start[numPolygons] = index;
			}
			
			polygonStart = false;
			render();
		}
	
        });
	
	colorMenu.addEventListener("click", function() {
       colorIndex = colorMenu.selectedIndex;
        });
    
    
	var a = document.getElementById("Button1")
    a.addEventListener("click", function(){
		// If the button is clicked, then end the polygon drawing process
		if (polygonStart) {
			if ( numIndices[numPolygons-1] < 3 )
			{
				index -= numIndices[numPolygons-1];
						
				// Assign the count of vertices of the last polygon to 0
				numIndices[numPolygons-1] = 0;
						
				// Decrease the number of polygons
				numPolygons--;
			}
			else {
				numIndices[numPolygons] = 0;
				start[numPolygons] = index;
			}
			
			polygonStart = false;
			render();
		}
    });

	
			
    canvas.addEventListener("mousedown", function(event){
	
		// If an object is wanted to be selected
		if ( controlIndex == REMOVE_OBJECT | controlIndex == ROTATE_OBJECT)
		{
			
		}

		// If an object is wanted to be created
		else if ( controlIndex == CREATE_POLYGON) {
			// If only the first vertex of the polygon/shape is determined
			if (!polygonStart)
			{
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
				
				t = vec4( red % colorCount, green % colorCount, blue % colorCount, 1.0 );
				
				// Add the unique color to the color array
				colorArray[numPolygons - 1] = t;
			}
			
			// Bind the color buffer to send color data to GPU
			gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
			gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(c));
			
			// Obtain the vertex
			t  = vec2(2*event.clientX/canvas.width-1, 
			   2*(canvas.height-event.clientY)/canvas.height-1);
			  
			// Bind the vertex buffer to send vertex data to GPU
			gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
			gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));
			
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
	
    // Determine the clear color (ligth grey)
	gl.clearColor( 0.9, 0.9, 0.9, 1.0 );
	
    // Clear the canvas (with grey)
	gl.clear( gl.COLOR_BUFFER_BIT );

    // Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
	// Creating the vertex buffer and binding it
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW );
	
	
    var vPos = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPos );
    
	// Creating the color buffer and binding it
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW );
	
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
	
}

function render() {
    // Clear the canvas (with grey) to redraw everything
    gl.clear( gl.COLOR_BUFFER_BIT );

	// Drawing each polygon
    for(var i=0; i<numPolygons; i++) {
        gl.drawArrays( gl.LINE_LOOP, start[i], numIndices[i] );
    }
}
<<<<<<< Updated upstream
/*
function createConvexPolygon(vertices, length)
=======

function createConvexPolygon(vertices)
{
	var convexVertices = [];
	var length = vertices.length;
	
	if (length > 3)
	{
		var lastPoint = vertices[length - 1];
		
		// Coordinates of the last point
		var x = lastPoint[0];
		var y = lastPoint[1];

		var distances = [];
		
		
		for (var i = 0; i <= length - 3; i++)
		{
			// Two consecutive points
			var P1 = vertices[i];
			var P2 = vertices[i+1];
			
			// Coordinates of the corresponding points
			var x1 = P1[0];
			var y1 = P1[1];
			var x2 = P2[0];
			var y2 = P2[1];
			
			// Line coefficients through P1 and P2
			var A = y2 - y1;
			var B = x1 - x2;
			var C = - A * x1 - B * y1;
			
			/*
			FIRST ALGORITHM: For each line through two consecutive points, find the closest one on that
			line to the given vertex.
			*/		
			
			// The slope of the line and the normal to that line
			m1 = -A / B;
			m2 = -1 / m1;
			
			// Coordinates of the closest point
			var x0 = (m1 * x1 - m2 * x - y1 + y) / (m1 - m2);
			var y0 = m2 * (x0 - x) + y;
			
			/*
			SECOND ALGORITHM: Check if the closest point is on the line segment through those two
			consecutive points.
			*/
			
			// The function that gives the line segment is f(a) = a * P1 + (1 - a) * P2.
			// This function is assigned to P0 and the corresponding system of linear equations
			// is solved to find the corresponding value of a. If a < 0 or a > 0, then the point
			// is not on the line segment.
			
			var coefficients = mat2(x1, x2, y1, y2);
			var rightHandSide = vec2(x0, y0);
			var inverseOfCoefficients = inverse(coefficients);
			
			var solution = mult(rightHandSide, inverseOfCoefficients);
			
			var a = solution[0];
			
			/*
			THIRD ALGORITHM: If the point in on that line segment, find the distance between the point
			and the given vertex. Add the distance to the list, add -1 otherwise.
			*/
			
			if ( a < 0 | a > 1 )
				distances[i] = -1;
			else
			{
				var distance = Math.abs(A * x + B * y + C) / Math.sqrt(Math.pow(A, 2) + Math.pow(B, 2));
				distances[i] = distance;
			}
		}

		/*
		FOURTH ALGORITM: Find the minimum of the distances and the corresponding points. Add the vertex
		in between these two point.
		*/
		
		// Find the minimum distance and the corresponding index of the vertex
		var minIndex = 0;
		var minimum = distances[0];
		
		for (var i = 0; i < length - 1; i++)
		{
			if ( distances[i] < minimum )
			{
				minIndex = i;
				minimum = distances[i];
			}
		}
		
		// If the point is where it belongs, do not change its place. Otherwise, change it.
		if ( minIndex == length - 2 )
			for ( var currentIndex = 0; currentIndex < length; currentIndex++ )
				convexVertices[currentIndex] = vertices[currentIndex];
			
		else
		{
			for ( var currentIndex = 0; currentIndex <= minIndex; currentIndex++ )
				convexVertices[currentIndex] = vertices[currentIndex];
				
			convexVertices[minIndex + 1] = lastPoint;
			
			for ( var currentIndex = minIndex + 1; currentIndex < length - 1; currentIndex++)
				convexVertices[currentIndex + 1] = vertices[currentIndex];
			
		}
	}
	
	else
	{
		for ( var currentIndex = 0; currentIndex < length; currentIndex++ )
			convexVertices[currentIndex] = vertices[currentIndex];
	}
	
	//console.log(convexVertices);
	return convexVertices;
}

function intersects(a,b,c,d,p,q,r,s)
{
	var det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);
	if (det === 0) {
		return false;
	} 
	else
	{
		lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
		gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
		return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
	}
}

function isInsidePolygon(polyVertices, vertex)
>>>>>>> Stashed changes
{
	//for (var i = 0; i < length; i++)
		//console.log(vertices[i]);
	
	return vertices;
}
*/