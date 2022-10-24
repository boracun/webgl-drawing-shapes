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
var clickPosition = null;
var mouseHasMoved = false;
var zoomPosition = vec2(0, 0);

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
	yComponent /= scaleAmount[1];

	xComponent -= translationAmount[0] / scaleAmount[0];
	yComponent -= translationAmount[1] / scaleAmount[1];

	let result = vec2(xComponent, yComponent);
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
	addVertexToBuffer(vertex);

	console.log(vertex);
	/**
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
	 */
	index++;

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

function calculateGeometricCenter(polygon) {
	let vectorSum = vec2(0, 0);
	let vertexCount = polygon.vertices.length;

	for (let i = 0; i < vertexCount; i++) {
		vectorSum = add(vectorSum, polygon.vertices[i]);
	}

	return vec2(vectorSum[0] / vertexCount, vectorSum[1] / vertexCount);
}

// Careful: The polygon passed must be referring to the polygons array element since the comparison is done with ==
function rotatePolygon(polygon, rotationAmount) {
	let center = calculateGeometricCenter(polygon);

	for (let i = 0; i < polygon.vertices.length; i++) {
		let xComponent = polygon.vertices[i][0];
		let yComponent = polygon.vertices[i][1];

		xComponent -= center[0];	// Bring the center to the origin
		yComponent -= center[1];

		console.log(xComponent, yComponent);

		xComponent = -Math.sin(rotationAmount) * yComponent + Math.cos(rotationAmount) * xComponent;	// Rotations around origin
		yComponent = Math.sin(rotationAmount) * xComponent + Math.cos(rotationAmount) * yComponent;

		console.log(xComponent, yComponent);

		xComponent += center[0];	// Take the center back
		yComponent += center[1];

		polygon.vertices[i] = vec2(xComponent, yComponent);
	}

	calculateEnclosingRectangle(polygon);

	polygons.splice(polygons.indexOf(polygon), 1);	// Remove this polygon from polygons
	polygons.push(polygon);	// Add it to the end

	addNewState();
	loadState(stateHistory[stateIndex], true);
}

function addNewState() {
	let currentState = new SceneState(index, vertexArray, colorArray, polygons);
	let currentStateData = JSON.stringify(currentState, null, 2);

	if (stateIndex == null) {
		stateHistory = [currentStateData];
		stateIndex = 0;
		return;
	}

	// Remove the latest states until the current state
	let stateHistoryLength = stateHistory.length;
	for (let i = 0; i < stateHistoryLength - 1 - stateIndex; i++) {
		stateHistory.pop();
	}

	// Remove the oldest state if there are 6 states
	if (stateHistory.length === 6) {
		stateHistory.shift();
	}

	// Add the current state
	stateHistory.push(currentStateData);
	stateIndex = stateHistory.length - 1;
}

function loadState(stateJson, refillBuffers = false) {
	// Get the current state from the history array and update the program values with current state values
	let currentState = JSON.parse(stateJson);

	index = currentState.index;
	vertexArray = currentState.vertexArray;
	colorArray = currentState.colorArray;
	polygons = currentState.polygons;

	scaleAmount = vec3(1, 1, 0);
	translationAmount = vec3(0, 0, 0);

	// Need to clear the buffers and refill them with the new polygons array
	if (refillBuffers) {
		index = 0;
		for (let i = 0; i < polygons.length; i++) {
			addColorToBuffer(polygons[i].color, polygons[i].vertices.length);
			addVertexToBuffer(polygons[i].vertices);
			index += polygons[i].vertices.length;
		}
	}

	render();
}

function undo() {
	if(stateIndex === 0)
		return;

	stateIndex--;
	loadState(stateHistory[stateIndex], true);
}

function redo() {
	if(stateIndex === 5 || stateIndex >= stateHistory.length - 1)
		return;

	stateIndex++;
	loadState(stateHistory[stateIndex], true);
}

function downloadScene() {
	let jsonString = 'data:text/json;charset=utf-8,' + encodeURIComponent(stateHistory[stateIndex]);
	let linkElement = document.getElementById('download-link');

	linkElement.setAttribute("href", jsonString);
	linkElement.setAttribute("download", "scene_" + new Date().toLocaleString() + ".json");
	linkElement.click();
}

function uploadScene() {
	// Scene is loaded with uploadedJson
	stateHistory = [uploadedJson];
	stateIndex = 0;
	loadState(uploadedJson, true);
}

function translateSpace(event) {
	let position2 = getClickPosition(event);
	let positionDiff = subtract(position2, clickPosition);

	translationAmount = add(translationAmount, vec3(positionDiff[0] * scaleAmount[0], positionDiff[1] * scaleAmount[1], 0));
	render();
}

function copyArea(event) {
	copiedPolygons = [];
	copiedPolygons.push(clickPosition);

	let click2 = getClickPosition(event);
	let bottomLeft = vec2(Math.min(clickPosition[0], click2[0]), Math.min(clickPosition[1], click2[1]));
	let topRight = vec2(Math.max(clickPosition[0], click2[0]), Math.max(clickPosition[1], click2[1]));

	for (let i = 0; i < polygons.length; i++) {
		if (isInsideArea(polygons[i], bottomLeft, topRight))
			copiedPolygons.push(polygons[i]);
	}
}

function pasteSelection(event) {
	if (copiedPolygons.length === 0)
		return;

	let copiedPolygonCount = copiedPolygons.length;
	let offset = subtract(getClickPosition(event), copiedPolygons[0]);

	for (let i = 1; i < copiedPolygonCount; i++) {
		let copied = structuredClone(copiedPolygons[i]);
		polygons.push(copied);
		translatePolygon(copied, null, offset, false);
	}

	addNewState();
	loadState(stateHistory[stateIndex], true);
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
			case SAVE_SCENE:
				downloadScene();
				break;
			case LOAD_SCENE:
				uploadScene();
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

	// The element used for uploading the json files
	const fileInputElement = document.getElementById("file-input");
	fileInputElement.addEventListener("change", function () {
		let reader = new FileReader();

		// When a new json is uploaded, the uploadedJson variable is updated
		reader.onload = function () {
			uploadedJson = reader.result;
		};

		reader.readAsText(this.files[0]);
	});

	// Mouse left click
	canvas.addEventListener("click", function (event) {
		switch (controlIndex) {
			case REMOVE_OBJECT:
				var vertex = getClickPosition(event);
				selected = [];
				addSelected(selected, vertex);
				console.log("selected objects:", selected);
				
				let objectToBeDeleted = selected[selected.length - 1];
				console.log("top object in selected:", selected[selected.length - 1]);
				remove(objectToBeDeleted);
				break;
			case ROTATE_OBJECT:
				// TODO: Pass the object to be rotated here (implement here after the object selection method)
				let objectToRotated = polygons[0];
				rotatePolygon(objectToRotated, Math.PI / 4);
				break;
			case ZOOM:
				scaleAmount = add(scaleAmount, SCALE_CONSTANT);
				render();
				break;
			case PASTE:
				pasteSelection(event);
				break;
			default:
				break;
		}
	});

	// Mouse right click
	canvas.addEventListener("contextmenu", function (event) {
		event.preventDefault();	// Disable right click menu
		switch (controlIndex) {
			case ZOOM:
				scaleAmount = subtract(scaleAmount, SCALE_CONSTANT);
				render();
				break;
			default:
				break;
		}
	});

	// Mousedown
    canvas.addEventListener("mousedown", function(event) {
		switch (controlIndex) {
			case DRAW_RECTANGLE:	// Rectangle draw mode
			case DRAW_TRIANGLE:		// Triangle draw mode
			case MOVE_OBJECT:		// Start of object movement
			case MOVE_AROUND:				// Start of move-around
			case COPY:				// Start of selection area
				clickPosition = getClickPosition(event);
				break;
			// If an object is wanted to be created
			case CREATE_POLYGON:
				addPolygonVertex(event);
				break;
		}
    });

	// Mouseup
	canvas.addEventListener("mouseup", function(event) {
		switch (controlIndex) {
			// Rectangle draw mode
			case DRAW_RECTANGLE:
				if (mouseHasMoved)
					createRectangle(event);
				clickPosition = null;
				mouseHasMoved = false;
				break;
			case DRAW_TRIANGLE:
				if (mouseHasMoved)
					createTriangle(event);
				clickPosition = null;
				mouseHasMoved = false;
				break;
			case MOVE_OBJECT:
				if (mouseHasMoved) {
					var vertex = clickPosition;
					selected = [];
					addSelected(selected, vertex);
					console.log("selected objects:", selected);

					if(selected.length > 0) {
						let objectToBeTranslated = selected[selected.length - 1];
						translatePolygon(objectToBeTranslated, event);
					}
				}
				clickPosition = null;
				mouseHasMoved = false;
				break;
			case MOVE_AROUND:
				if (mouseHasMoved)
					translateSpace(event);
				clickPosition = null;
				mouseHasMoved = false;
				break;
			case COPY:
				if (mouseHasMoved)
					copyArea(event);
				clickPosition = null;
				mouseHasMoved = false;
				console.log(copiedPolygons);
				break;
			default:
				break;
		}
	});

	// Mouse move / drag
	canvas.addEventListener("mousemove", function(event){
		switch (controlIndex) {
			// Detect drag
			case DRAW_RECTANGLE:
			case DRAW_TRIANGLE:
			case MOVE_OBJECT:
			case MOVE_AROUND:
			case COPY:
				mouseHasMoved = (clickPosition !== null);
				break;
			default:
				break;
		}
	});

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

	transformationMatrixLocation = gl.getUniformLocation(program, "transformationMatrix");

	addNewState();
}

function render() {
    // Clear the canvas (with grey) to redraw everything
    gl.clear(gl.COLOR_BUFFER_BIT);

	// let translationMatrix = translate(-zoomPosition[0], -zoomPosition[1], 0);
	let translationMatrix = translate(translationAmount[0], translationAmount[1], 0);
	let scaleMatrix = scale(scaleAmount);
	// let inverseTranslationMatrix = translate(vec3(zoomPosition, 0));
	let transformationMatrix = mult(translationMatrix, scaleMatrix);
	// transformationMatrix = mult(inverseTranslationMatrix, transformationMatrix);
	gl.uniformMatrix4fv(transformationMatrixLocation, false, flatten(transformationMatrix));

	// console.log(zoomPosition);

	// Drawing each polygon
	let startIndex = 0;
    for(var i = 0; i < polygons.length; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, startIndex, polygons[i].vertices.length);
		startIndex += polygons[i].vertices.length;
    }
}
/*
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
			
			///
			FIRST ALGORITHM: For each line through two consecutive points, find the closest one on that
			line to the given vertex.
			//		
			
			// The slope of the line and the normal to that line
			m1 = -A / B;
			m2 = -1 / m1;
			
			// Coordinates of the closest point
			var x0 = (m1 * x1 - m2 * x - y1 + y) / (m1 - m2);
			var y0 = m2 * (x0 - x) + y;
			
			///
			SECOND ALGORITHM: Check if the closest point is on the line segment through those two
			consecutive points.
			//
			
			// The function that gives the line segment is f(a) = a * P1 + (1 - a) * P2.
			// This function is assigned to P0 and the corresponding system of linear equations
			// is solved to find the corresponding value of a. If a < 0 or a > 0, then the point
			// is not on the line segment.
			
			var coefficients = mat2(x1, x2, y1, y2);
			var rightHandSide = vec2(x0, y0);
			var inverseOfCoefficients = inverse(coefficients);
			
			var solution = mult(rightHandSide, inverseOfCoefficients);
			
			var a = solution[0];
			
			///
			THIRD ALGORITHM: If the point in on that line segment, find the distance between the point
			and the given vertex. Add the distance to the list, add -1 otherwise.
			//
			
			if ( a < 0 | a > 1 )
				distances[i] = -1;
			else
			{
				var distance = Math.abs(A * x + B * y + C) / Math.sqrt(Math.pow(A, 2) + Math.pow(B, 2));
				distances[i] = distance;
			}
		}

		///
		FOURTH ALGORITM: Find the minimum of the distances and the corresponding points. Add the vertex
		in between these two point.
		//
		
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
*/
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
{
	var sumReal = 0;
	var sumImag = 0;
	var sum = 0;
	console.log(vertex);
	for (var i = 1; i < polyVertices.length + 1; i++)
	{
		var v0 = polyVertices[i - 1];
		var v1 = polyVertices[i % polyVertices.length];

		
		var firstReal = v1[0] - vertex[0];
		var firstImag = v1[1] - vertex[1];
		var firstLength = Math.sqrt(Math.pow(firstReal, 2) + Math.pow(firstImag, 2));
		
		var secondReal = v0[0] - vertex[0];
		var secondImag = v0[1] - vertex[1];
		var secondLength = Math.sqrt(Math.pow(secondReal, 2) + Math.pow(secondImag, 2));
		
		var firstAngle;
		var secondAngle;
		
		if (firstImag < 0)
			firstAngle = -Math.acos( firstReal / firstLength);
		else
			firstAngle = Math.acos( firstReal / firstLength);
		
		if (secondImag < 0)
			secondAngle = -Math.acos( secondReal / secondLength);
		else
			secondAngle = Math.acos( secondReal / secondLength);
		
		var angleDif = firstAngle - secondAngle;
		
		if (angleDif < (-branchAngle))
			angleDif += 2 * Math.PI;
		else if (angleDif > branchAngle)
			angleDif -= 2 * Math.PI;
		
		sumReal += Math.log(firstLength) - Math.log(secondLength);
		sumImag += angleDif;
		
	}
	
	sum = Math.sqrt(Math.pow(sumReal, 2) + Math.pow(sumImag, 2));
	return sum > 1;
}

function addSelected(selected, vertex)
{
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++)
	{
		var check = isInsidePolygon(polygons[polygonIndex].vertices, vertex);
		
		if (check)
			selected.push(polygons[polygonIndex]);
	}	
}