class Shape {
    points;
    color;

    constructor(points, color) {
        this.points = points;
        this.color = color;
    }
}

class Rectangle extends Shape {
    constructor(begin, end, color) {
        super([], color);
        this.points.push(begin);
        this.points.push(vec2(begin[0], end[1]));
        this.points.push(end);
        this.points.push(vec2(end[0], begin[1]));
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
        this.points.push(vec2(topX, topY));
        this.points.push(vec2(begin[0], end[1]));
        this.points.push(end);
    }
}