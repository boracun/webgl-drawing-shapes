class Polygon {
    vertices;
    color;

    constructor(vertices, color) {
        this.vertices = vertices;
        this.color = color;
    }

    addVertex(vertex) {
        this.vertices.push(vertex);
    }
}

class Rectangle extends Polygon {
    constructor(begin, end, color) {
        super([], color);
        this.vertices.push(begin);
        this.vertices.push(vec2(begin[0], end[1]));
        this.vertices.push(end);
        this.vertices.push(vec2(end[0], begin[1]));
    }
}

class Triangle extends Polygon {
    constructor(begin, end, color) {
        super([], color);

        // Swap begin and end if end is above begin
        if(begin[1] < end[1]) {
            let temp = begin;
            begin = end;
            end = temp;
        }

        let topX = (begin[0] + end[0]) / 2;
        let topY = (Math.abs(end[0] - begin[0]) * Math.sqrt(3) / 2) + end[1];
        this.vertices.push(vec2(topX, topY));
        this.vertices.push(vec2(begin[0], end[1]));
        this.vertices.push(end);
    }
}

const DRAW_RECTANGLE = 0;
const DRAW_TRIANGLE = 1;
const CREATE_POLYGON = 2;
const MOVE_OBJECT = 3;
const REMOVE_OBJECT = 4;
const ROTATE_OBJECT = 5;
const UNDO = 6;
const REDO = 7;
const ZOOM = 8;
const SAVE_SCENE = 9;
const LOAD_SCENE = 10;

// 8 predefined colors
var colors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ), // black
    vec4( 1.0, 0.0, 0.0, 1.0 ), // red
    vec4( 1.0, 1.0, 0.0, 1.0 ), // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ), // green
    vec4( 0.0, 1.0, 1.0, 1.0 ), // cyan
    vec4( 0.0, 0.0, 1.0, 1.0 ), // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ), // magenta
    vec4( 1.0, 1.0, 1.0, 1.0 ) 	// white
];