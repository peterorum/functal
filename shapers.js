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

  var makeLine = function(x1, y1, x2, y2, centre, angle) {

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

    return {
      p1: point1,
      p2: point2
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
    var radius2 = math.random(0, 1);
    var radius = math.max(radius1, radius2);
    var angle = math.random(0, 2 * math.pi);

    var lines = [];

    for (var p = 0; p < points; p++) {
      var x1 = centre.x + radius1 * math.cos(math.pi * 2 / points * p);
      var y1 = centre.y + radius2 * math.sin(math.pi * 2 / points * p);

      var x2 = centre.x + radius1 * math.cos(math.pi * 2 / points * (p + 1));
      var y2 = centre.y + radius2 * math.sin(math.pi * 2 / points * (p + 1));

      lines.push(makeLine(x1, y1, x2, y2, centre, angle));
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

      lines.push(makeLine(x1, y1, x2, y2, centre, angle));
    }

    for (let p2 = (isBordered ? 0 : 1); p2 < (isBordered ? points2 + 1 : points2); p2++) {
      let x1 = -radius;
      let y1 = radius * (-1 + 2 / points2 * p2);

      let x2 = radius;
      let y2 = y1;

      lines.push(makeLine(x1, y1, x2, y2, centre, angle));
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

  var makeZigzag = function() {
    let shape = {};

    var centre = {
      x: 0,
      y: 0
    };

    let radius = math.random(0, 1);
    let points = 3 + Rp.bandomInt(8, 2);
    let angle = math.random(0, 2 * math.pi);

    let lines = [];

    for (let p = 0; p < points; p++) {

      let x1 = radius * (p % 2 ? 1 : -1);
      let x2 = -x1;

      let y1 = radius - (2 * radius) / points * p;
      let y2 = radius - (2 * radius) / points * (p + 1);

      lines.push(makeLine(x1, y1, x2, y2, centre, angle));
    }

    shape.lines = lines;

    shape.params = {
      points: points,
      angle: angle
    };

    shape.name = "zigzag";

    return shape;
  };

  var makeWavy = function() {
    let shape = {};

    var centre = {
      x: 0,
      y: 0
    };

    let radius = math.random(0, 1);
    let points = 50; // segments
    let angle = math.random(0, 2 * math.pi);

    let freq = math.randomInt(1, 9);
    let ampl = math.random(0, 1);
    let phase = math.random(0, 2 * math.pi);

    // reverse image
    let isHelix = (math.random() < 0.1);

    let lines = [];

    var pif = 2 * math.pi * freq / radius / 2;

    for (let p = 0; p < points; p++) {

      let x1 = -radius + (2 * radius) / points * p;
      let x2 = -radius + (2 * radius) / points * (p + 1);

      let y1 = ampl * math.cos(pif * x1 + phase);
      let y2 = ampl * math.cos(pif * x2 + phase);

      lines.push(makeLine(x1, y1, x2, y2, centre, angle));

      if (isHelix) {
        lines.push(makeLine(x1, -y1, x2, -y2, centre, angle));
      }
    }

    shape.lines = lines;

    shape.params = {
      freq: freq,
      ampl: ampl,
      phase: phase,
      radius: radius,
      helix: isHelix,
      angle: angle
    };

    shape.name = "wavy";

    return shape;
  };

  var makeCrescent = function() {
    let shape = {};

    var centre = {
      x: 0,
      y: 0
    };

    let radius = math.random(0, 1);
    let points = 50; // segments
    let angle = math.random(0, 2 * math.pi);

    let freq = 0.5;
    let ampl = [math.random(0, 1), math.random(0, 1)];

    let isBead = (math.random() < 0.1);

    let lines = [];

    var pif = 2 * math.pi * freq / radius / 2;

    for (let arc = 0; arc < 2; arc++) {

      for (let p = 0; p < points; p++) {

        let x1 = -radius + (2 * radius) / points * p;
        let x2 = -radius + (2 * radius) / points * (p + 1);

        let y1 = ampl[arc] * math.cos(pif * x1);
        let y2 = ampl[arc] * math.cos(pif * x2);

        if (arc === 1 && isBead) {
          y1 = -y1;
          y2 = -y2;
        }

        lines.push(makeLine(x1, y1, x2, y2, centre, angle));
      }
    }

    shape.lines = lines;

    shape.params = {
      ampl: ampl,
      radius: radius,
      bead: isBead,
      angle: angle
    };

    shape.name = "crescent";

    return shape;
  };

  var makeEllipse = function() {
    let shape = {};

    var centre = {
      x: 0,
      y: 0
    };

    let radius1 = math.random(0, 1);
    let radius2 = math.random(0, 1);
    let points = 50; // segments
    let angle = math.random(0, 2 * math.pi);

    let lines = [];

    for (let p = 0; p < points; p++) {

      var angle1 = math.pi * 2 / points * p;
      var angle2 = math.pi * 2 / points * (p + 1);

      var x1 = radius1 * math.cos(angle1);
      var y1 = radius2 * math.sin(angle1);
      var x2 = radius1 * math.cos(angle2);
      var y2 = radius2 * math.sin(angle2);

      lines.push(makeLine(x1, y1, x2, y2, centre, angle));
    }

    shape.lines = lines;

    shape.params = {
      radius1: radius1,
      radius2: radius2,
      angle: angle
    };

    shape.name = "ellipse";

    return shape;
  };

  var makeStar = function() {
    let shape = {};

    var centre = {
      x: 0,
      y: 0
    };

    let radius1 = math.random(0, 1);
    let radius2 = math.random(0, 1);
    let points = 2 * (math.randomInt(3, 26));
    let angle = math.random(0, 2 * math.pi);

    let lines = [];

    for (let p = 0; p < points; p++) {

      var angle1 = math.pi * 2 / points * p;
      var angle2 = math.pi * 2 / points * (p + 1);

      var eradius1 = (p % 2 ? radius1 : radius2);
      var eradius2 = (p % 2 ? radius2 : radius1);

      var x1 = eradius1 * math.cos(angle1);
      var y1 = eradius1 * math.sin(angle1);
      var x2 = eradius2 * math.cos(angle2);
      var y2 = eradius2 * math.sin(angle2);

      lines.push(makeLine(x1, y1, x2, y2, centre, angle));
    }

    shape.lines = lines;

    shape.params = {
      radius1: radius1,
      radius2: radius2,
      angle: angle
    };

    shape.name = "star";

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
      lines.push(makeLine(-radius, 0, radius, 0, centre, math.pi * 2 / linesCount * p1 + angle));
    }

    shape.lines = lines;

    shape.params = {
      angle: angle
    };

    shape.name = "asterisk";

    return shape;
  };

  var makeArrow = function() {

    let shape = {};

    var centre = {
      x: 0,
      y: 0
    };

    let radius = math.random(0, 1);
    let angle = math.random(0, 2 * math.pi);

    let lines = [];

    // stem
    lines.push(makeLine(-radius, 0, radius, 0, centre, angle));

    // arrow
    lines.push(makeLine(radius / 2, radius / 2, radius, 0, centre, angle));
    lines.push(makeLine(radius / 2, -radius / 2, radius, 0, centre, angle));

    shape.lines = lines;

    shape.params = {
      angle: angle
    };

    shape.name = "arrow";

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
    },
    {
      fn: function() {

        return {
          name: "arrow",
          make: () => {

            return makeArrow();
          }
        };
      },
      weight: 1,
    },
    {
      fn: function() {

        return {
          name: "zigzag",
          make: () => {

            return makeZigzag();
          }
        };
      },
      weight: 1
    },
    {
      fn: function() {

        return {
          name: "wavy",
          make: () => {

            return makeWavy();
          }
        };
      },
      weight: 4
    },
    {
      fn: function() {

        return {
          name: "crescent",
          make: () => {

            return makeCrescent();
          }
        };
      },
      weight: 1
    },
    {
      fn: function() {

        return {
          name: "ellipse",
          make: () => {

            return makeEllipse();
          }
        };
      },
      weight: 1
    },
    {
      fn: function() {

        return {
          name: "star",
          make: () => {

            return makeStar();
          }
        };
      },
      weight: 1
    }
  ];
}());
