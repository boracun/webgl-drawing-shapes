class Shape {
    vertices;
    color;

    constructor(points, color) {
        this.vertices = points;
        this.color = color;
    }

    addVertex(vertex) {
        this.vertices.push(vertex);
    }
}

class Rectangle extends Shape {
    constructor(begin, end, color) {
        super([], color);
        this.vertices.push(begin);
        this.vertices.push(vec2(begin[0], end[1]));
        this.vertices.push(end);
        this.vertices.push(vec2(end[0], begin[1]));
    }
}

class Triangle extends Shape {
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