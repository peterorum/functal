(function() {

  "use strict";

  var math = require('mathjs');

  // var R = require('ramda');
  var Rp = require('./plus-fp/plus-fp');

  var rotate = function(point, centre, angle) {

    // assumes zero centre

    var x = point.x - centre.x;
    var y = point.y - centre.y;

    if ((x !== 0) || (y !== 0)) {
      var r = math.sqrt(x * x + y * y);
      var theta = math.atan2(y, x);

      theta += angle;

      x = r * math.cos(theta);
      y = r * math.sin(theta);

      x += centre.x;
      y += centre.y;
    }

    return {
      x: x,
      y: y
    };
  };

  var makePolygon = () => {

    let polygon = {};

    var centre = {
      x: 0,
      y: 0
    };

    var points = 3 + Rp.bandomInt(6, 2);
    var radius1 = math.random(0, 1);
    var radius2 = radius1; //math.random(0, 1);
    var radius = math.max(radius1, radius2);
    var angle = math.random(0, 2 * math.pi);

    var lines = [];

    for (var p = 0; p < points; p++) {
      var x1 = centre.x + radius1 * math.cos(math.pi * 2 / points * p);
      var y1 = centre.y + radius2 * math.sin(math.pi * 2 / points * p);

      var x2 = centre.x + radius1 * math.cos(math.pi * 2 / points * (p + 1));
      var y2 = centre.y + radius2 * math.sin(math.pi * 2 / points * (p + 1));

      var point1 = {
        x: x1,
        y: y1
      };

      point1 = rotate(point1, centre, angle);

      var point2 = {
        x: x2,
        y: y2
      };

      point2 = rotate(point2, centre, angle);

      var line = {
        p1: point1,
        p2: point2
      };

      lines.push(line);
    }

    polygon.lines = lines;

    polygon.params = {
      radius: radius,
      angle: angle
    };

    polygon.name = "polygon";

    return polygon;
  };

  var makeCrosshatch = function() {
    let shape = {};

    var centre = {
      x: 0,
      y: 0
    };

    let radius = math.random(0, 1);
    let points1 = 2 + Rp.bandomInt(6, 2);
    let points2 = 2 + Rp.bandomInt(6, 2);
    let angle = math.random(0, 2 * math.pi);
    let isBordered = math.random(0, 1) < 0.5;

    let lines = [];

    for (let p1 = (isBordered ? 0 : 1); p1 < (isBordered ? points1 + 1 : points1); p1++) {
      let x1 = radius * (-1 + 2 / points1 * p1);
      let y1 = -radius;

      let x2 = x1;
      let y2 = radius;

      let point1 = {
        x: x1,
        y: y1
      };

      let point2 = {
        x: x2,
        y: y2
      };

      point1 = rotate(point1, centre, angle);
      point2 = rotate(point2, centre, angle);

      lines.push({
        p1: point1,
        p2: point2
      });
    }

    for (let p2 = (isBordered ? 0 : 1); p2 < (isBordered ? points2 + 1 : points2); p2++) {
      let x1 = -radius;
      let y1 = radius * (-1 + 2 / points2 * p2);

      let x2 = radius;
      let y2 = y1;

      let point1 = {
        x: x1,
        y: y1
      };

      let point2 = {
        x: x2,
        y: y2
      };

      point1 = rotate(point1, centre, angle);
      point2 = rotate(point2, centre, angle);

      lines.push({
        p1: point1,
        p2: point2
      });
    }

    shape.lines = lines;

    shape.params = {
      points1: points1,
      points2: points2,
      isBordered: isBordered,
      angle: angle
    };

    shape.name = "crosshatch";

    return shape;
  };

  var makeAsterisk = function() {

    let shape = {};

    var centre = {
      x: 0,
      y: 0
    };

    let radius = math.random(0, 1);
    let linesCount = 2 + Rp.bandomInt(7, 1);
    let angle = math.random(0, 2 * math.pi);

    let lines = [];

    for (let p1 = 0; p1 < linesCount; p1++) {
      let x1 = -radius;
      let y1 = 0;

      let x2 = radius;
      let y2 = 0;

      let point1 = {
        x: x1,
        y: y1
      };

      let point2 = {
        x: x2,
        y: y2
      };

      point1 = rotate(point1, centre, math.pi * 2 / linesCount * p1);
      point2 = rotate(point2, centre, math.pi * 2 / linesCount * p1);

      point1 = rotate(point1, centre, angle);
      point2 = rotate(point2, centre, angle);

      lines.push({
        p1: point1,
        p2: point2
      });
    }

    shape.lines = lines;

    shape.params = {
      angle: angle
    };

    shape.name = "asterisk";

    return shape;
  };

  //---

  exports.shapers = [
    {
      fn: function() {

        return {
          name: "polygon",
          make: () => {

            return makePolygon();
          }
        };
      },
      weight: 4,
    },
    {
      fn: function() {

        return {
          name: "crosshatch",
          make: () => {

            return makeCrosshatch();
          }
        };
      },
      weight: 1,
    },
    {
      fn: function() {

        return {
          name: "asterisk",
          make: () => {

            return makeAsterisk();
          }
        };
      },
      weight: 1,
    }
  ];
}());
