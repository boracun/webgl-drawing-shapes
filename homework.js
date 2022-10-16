var canvas;
var gl;

var maxNumTriangles = 200;  
var maxNumVertices  = 3 * maxNumTriangles;
var index = 0;

// Menu indices
var controlIndex = 0;
var colorIndex = 0;

var t;
var numPolygons = 0;
var numIndices = [];
numIndices[0] = 0;
var start = [0];

var polygonStart = true;

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
        });
	
	colorMenu.addEventListener("click", function() {
       colorIndex = colorMenu.selectedIndex;
        });
    
    
	var a = document.getElementById("Button1")
    a.addEventListener("click", function(){
    numIndices[numPolygons] = 0;
    start[numPolygons] = index;
	polygonStart = true;
    render();
    });

    canvas.addEventListener("mousedown", function(event){
		if (polygonStart)
		{
			numPolygons++;
			polygonStart = false;
		}
		
		// Obtain the vertex
        t  = vec2(2*event.clientX/canvas.width-1, 
           2*(canvas.height-event.clientY)/canvas.height-1);
		
		// Bind the vertex buffer to send vertex data to GPU
        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));

		// Obtain the color of the index
        t = vec4(colors[colorIndex]);
        
		// Bind the color buffer to send color data to GPU
        gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));

		// Increasing the count of vertices corresponding to the current polygon
        numIndices[numPolygons-1]++;
        index++;
		
		render();
		// If the count of vertices of a polygon is at least 3, it can be drawn
		if (numIndices[numPolygons] >= 3)
		{
			
		}
    } );


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
        gl.drawArrays( gl.TRIANGLE_STRIP, start[i], numIndices[i] );
    }
}