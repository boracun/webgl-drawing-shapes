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

var uploadedJson;

var SCALE_CONSTANT = vec3(0.2, 0.2, 0);
var scaleAmount = vec3(1, 1, 0);

var translationAmount = vec3(0, 0, 0);

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
		else
			addNewState();

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
			t  = vec2(2*event.clientX/canvas.width-1, 
			   2*(canvas.height-event.clientY)/canvas.height-1);
			  
			// Bind the vertex buffer to send vertex data to GPU
			gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
			gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));
			
			// Fill the vertex array		
			vertexArray[index] = t;
			
			// Obtain the starting and ending vertices, and the vertex count to create a convex polygon
			var startIndex = start[numPolygons - 1];
			var endIndex = index + 1; // do not include
			var vertexCount = numIndices[numPolygons-1] + 1;			
			
			deepCopyVertexArray = [];
			for ( var i = startIndex; i < endIndex; i++)
				deepCopyVertexArray[i - startIndex] = vertexArray[i];
			
			console.log(vertexArray);
			console.log(deepCopyVertexArray);
			// Obtain the convex polygon with given vertices
			var convexVertices = createConvexPolygon(deepCopyVertexArray);
			
			//console.log(convexVertices);
			
			// Bind the vertex buffer to send the corrected vertices data to GPU
			gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
			
			for ( var count = 0; count < vertexCount; count++ )
			{
				gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index - vertexCount + count + 1), flatten(convexVertices[count]));
			}
			
			//gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));
			// Increasing the count of vertices corresponding to the current polygon
			numIndices[numPolygons-1]++;
			index++;
			
			for (var i = 0; i < vertexCount; i++)
				vertexArray[index - vertexCount + i] = convexVertices[i];
			
			//console.log(vertexArray);
	 */
	index++;

	render();
}

// Careful: The polygon passed must be referring to the polygons array element since the comparison is done with ==
function translatePolygon(polygon, event) {
	let position2 = getClickPosition(event);
	let positionDiff = subtract(position2, clickPosition);
	for (let i = 0; i < polygon.vertices.length; i++) {
		polygon.vertices[i] = add(polygon.vertices[i], positionDiff);
	}

	addNewState();
	loadState(stateHistory[stateIndex], true);
}

// Careful: The polygon passed must be referring to the polygons array element since the comparison is done with ==
function remove(polygon) {
	let elementIndex = polygons.indexOf(polygon);

	// Remove that element
	polygons.splice(elementIndex, 1);
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

	translationAmount = add(translationAmount, vec3(positionDiff[0], positionDiff[1], 0));
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
				// TODO: Pass the object to be deleted here (implement here after the object selection method)
				let objectToBeDeleted = polygons[0];
				remove(objectToBeDeleted);
				break;
			case ZOOM:
				scaleAmount = add(scaleAmount, SCALE_CONSTANT);
				zoomPosition = getClickPosition(event);
				render();
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
				zoomPosition = getClickPosition(event);
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
			case ZOOM:				// Start of move-around
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
				if (mouseHasMoved)
					translatePolygon(polygons[0], event);
				clickPosition = null;
				mouseHasMoved = false;
				break;
			case ZOOM:
				if (mouseHasMoved)
					translateSpace(event);
				clickPosition = null;
				mouseHasMoved = false;
				break;
			default:
				break;
		}
	});

	// Used only for moving an object
	canvas.addEventListener("mousemove", function(event){
		switch (controlIndex) {
			// Detect drag
			case DRAW_RECTANGLE:
			case DRAW_TRIANGLE:
			case MOVE_OBJECT:
			case ZOOM:
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

		var distances = [];
		
		var lastX = lastPoint[0];
		var lastY = lastPoint[1];
			
		for (var i = 0; i < length - 1; i++)
		{
			var currentPoint = vertices[i];
					
			var currentX = currentPoint[0];
			var currentY = currentPoint[1];
			
			var distance = Math.sqrt(Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2));
			distances[i] = distance;
		}
		
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
		
		console.log(minIndex);
		
		var possibleLeft;
		var possibleRight;
		var leftIndex;
		var rightIndex;
		var leftX;
		var leftY;
		var rightX;
		var rightY;
		
		var middleX = vertices[minIndex][0];
		var middleY = vertices[minIndex][1];
		
		// Find the possible next vertices (left and right)
		if (minIndex == 0)
		{
			leftIndex = length - 2;
			rightIndex = minIndex + 1;
		}
		else if (minIndex == length - 2)
		{
			rightIndex = 0;
			leftIndex = minIndex - 1;
		}
		else
		{
			leftIndex = minIndex - 1;
			rightIndex = minIndex + 1;
		}
		
		possibleLeft = vertices[leftIndex];
		possibleRight = vertices[rightIndex];
		
		// Calculate the minimum distance from the possible next vertex
		leftX = possibleLeft[0]; 
		leftY = possibleLeft[1]; 
		rightX = possibleRight[0];
		rightY = possibleRight[1];
		
		
		var intersect = intersects(lastX, lastY, leftX, leftY, rightX, rightY, middleX, middleY);
		
		
		// Finalize the left and right vertices
		if ( intersect )
			leftIndex = minIndex;
		
		else
			rightIndex = minIndex;
			
			
		// Place the last vertex to where it belongs
		if (rightIndex != 0)
		{
			for ( var currentIndex = 0; currentIndex <= leftIndex; currentIndex++ )
				convexVertices[currentIndex] = vertices[currentIndex];
				
			convexVertices[leftIndex + 1] = lastPoint;
			
			for ( var currentIndex = rightIndex; currentIndex < length - 1; currentIndex++)
				convexVertices[currentIndex + 1] = vertices[currentIndex];
		}
		else
		{
			for ( var currentIndex = 0; currentIndex < length; currentIndex++ )
				convexVertices[currentIndex] = vertices[currentIndex];
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
