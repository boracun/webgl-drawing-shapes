class SceneState {
    index;
    vertexArray;
    colorArray;
    polygons;

    constructor(index, vertexArray, colorArray, polygons) {
        this.index = index;
        this.vertexArray = vertexArray;
        this.colorArray = colorArray;
        this.polygons = polygons;
    }
}

class Polygon {
    vertices;
    color;
    bottomLeft; // Bottom left corner coordinates of the smallest enclosing rectangle
    topRight;   // Top right corner coordinates of the smallest enclosing rectangle

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
        calculateEnclosingRectangle(this);
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
        calculateEnclosingRectangle(this);
    }
}

// Call after all the vertices are given or after an update
function calculateEnclosingRectangle(polygon) {
    let xComponents = [];
    let yComponents = [];

    for (let i = 0; i < polygon.vertices.length; i++) {
        xComponents.push(polygon.vertices[i][0]);
        yComponents.push(polygon.vertices[i][1]);
    }

    let minX = Math.min(...xComponents);
    let minY = Math.min(...yComponents);
    let maxX = Math.max(...xComponents);
    let maxY = Math.max(...yComponents);

    polygon.bottomLeft = vec2(minX, minY);
    polygon.topRight = vec2(maxX, maxY);
}

// Returns true if this polygon is fully inside or on the given rectangular area, returns false otherwise
function isInsideArea(polygon, areaBottomLeft, areaTopRight) {
    if (areaBottomLeft[0] > polygon.bottomLeft[0])
        return false;
    if (areaBottomLeft[1] > polygon.bottomLeft[1])
        return false;
    if (areaTopRight[0] < polygon.topRight[0])
        return false;
    if (areaTopRight[1] < polygon.topRight[1])
        return false;
    return true;
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function getRadiansBetweenThreePoints(first, second, third) {
    let vectorOne = subtract(first, second);
    let vectorTwo = subtract(third, second);

    // atan2 gets the angle between vector and positive x-axis
    // Careful: atan2 function takes parameters as (y, x)
    let radians1 = Math.atan2(vectorOne[1], vectorOne[0]);
    let radians2 = Math.atan2(vectorTwo[1], vectorTwo[0]);

    if (radians1 < 0)
        radians1 += 2 * Math.PI;

    if (radians2 < 0)
        radians2 += 2 * Math.PI;

    return (radians1 - radians2); // * 180 / Math.PI;
}

// console.log(getRadiansBetweenThreePoints(vec2(0, 0), vec2(4, 1), vec2(5, 5)));

function checkPositiveAngle(first, second, third) {
    let radians = getRadiansBetweenThreePoints(first, second, third);
    return radians >= 0 && radians < Math.PI;
}

function getConvexHull(vertexList) {
    let convexHullIndices = [];

    // Find the left-most point as the starting point
    let leftMostVertex = vertexList.reduce(function (prev, cur) {
       return prev[0] < cur[0] ? prev : cur;
    });

    let leftMostIndex = vertexList.indexOf(leftMostVertex);

    let p = leftMostIndex;
    let q = (leftMostIndex + 1) % vertexList.length;

    // We want the full circle
    do {
        for (let i = 0; i < vertexList.length; i++) {
            if (i === q && i === vertexList.length - 1) {
                convexHullIndices.push(q);
                p = q;
                q = (q + 1) % vertexList.length;
                continue;
            }
            if (i === q)
                continue;
            if (!checkPositiveAngle(vertexList[p], vertexList[q], vertexList[i])) {
                q = (q + 1) % vertexList.length;
                break;
            }
            if (i === vertexList.length - 1) {
                convexHullIndices.push(q);
                p = q;
                q = (q + 1) % vertexList.length;
            }
        }
    } while (!convexHullIndices.includes(leftMostIndex));

    return convexHullIndices.map(function (element) {
        return vertexList[element];
    });
}

// console.log(getConvexHull([vec2(0, 0), vec2(4, 1), vec2(8, 2), vec2(5, 5), vec2(3, 7)]));

const DRAW_RECTANGLE = 0;
const DRAW_TRIANGLE = 1;
const CREATE_POLYGON = 2;
const MOVE_OBJECT = 3;
const REMOVE_OBJECT = 4;
const ROTATE_OBJECT = 5;
const UNDO = 6;
const REDO = 7;
const ZOOM = 8;
const MOVE_AROUND = 9;
const SAVE_SCENE = 10;
const LOAD_SCENE = 11;
const COPY = 12;
const PASTE = 13;

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