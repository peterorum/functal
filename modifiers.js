(function() {

  "use strict";

  var math = require('mathjs');

  var R = require('ramda');
  var Rp = require('./plus-fp/plus-fp');
  var clr = require('./color');

  var shapers = require('./shapers').shapers;

  // modifying the final result
  // return -1..1

  exports.reducers = [{
      name: 'min',
      fn: math.min,
      weight: 1
    }, {
      name: 'max',
      fn: math.max,
      weight: 1
    }
    // {
    //     name: 'last',
    //     fn: R.last,
    //     weight: 1
    // },
    // {
    //     name: 'mean',
    //     fn: math.mean,
    //     weight: 1
    // }
  ];

  // determines if the endpoint is within a band of the shape
  // used as a bounder
  var bander = function(options) {

    var fn = R.curry(function(band, distance, maxDistance) {

      var x;

      if (math.abs(distance - maxDistance) < band) {
        x = (distance - maxDistance) % 1;
      } else {
        x = 0;
      }

      return x;
    });

    var band = Rp.bandom(options.maxDistance, 2);

    return {
      name: "band",
      band: band,
      fn: fn(band)
    };
  };

  var bounders = [{
      fn: function() {

        return {
          name: "inside",
          fn: function(distance, maxDistance) {

            return (distance < maxDistance ? (distance - maxDistance) % 1 : 0);
          }
        };
      },
      weight: 1,
    },

    {
      fn: function() {

        return {
          name: "outside",
          fn: function(distance, maxDistance) {

            return (distance > maxDistance ? (distance - maxDistance) % 1 : 0);
          }
        };
      },
      weight: 1,
    }, {
      fn: bander,
      weight: 4
    }
  ];

  var adjx = function(x, adj) {

    x += adj;

    if (x < -1) {
      x = 2 + x;
    } else if (x > 1) {
      x = -2 + x;
    }

    return x;
  };


  var normalize = function(vals) {

    var max = math.max(R.map(math.abs, vals));

    return math.divide(vals, max);
  };

  var distancers = [{
      fn: function() {

        return {
          name: "edge",
          fn: function(z /*, lines*/ ) {

            return math.min(z.re, z.im);
          }
        };
      },
      weight: 1,
    }, {
      fn: function() {

        return {
          name: "edges",
          fn: function(z, lines) {

            return math.min(z.re, z.im, 1 / lines - z.re, 1 / lines - z.im);
          }
        };
      },
      weight: 1,
    }, {
      fn: function() {

        return {
          name: "point",
          fn: function(z, lines) {

            return math.sqrt(math.norm(math.subtract(z, math.complex(0.5 / lines, 0.5 / lines))));
          }
        };
      },
      weight: 1,
    },

  ];

  //------------- get topic for title

  exports.genericTopics = ['curve', 'spider', 'swarm', 'collapse', 'crash', 'collide', 'spray', 'swirl', 'chaos', 'chaotic', 'random', 'ocean', 'map', 'paradise',
    'universe', 'weather', 'imagination', 'web'
  ];


  exports.getTopic = function(functal) {
    var topic = null;

    var prob = math.random() < 0.5;

    //------------ try to use first shape trap

    if (prob < 0.2) {
      topic = exports.genericTopics[math.random(0, exports.genericTopics.length)];
    }

    if (!topic && prob < 0.5) {
      var trap = R.find((m) => m.name === 'shape trap', functal.modifierParams);

      if (trap) {
        var trackedShapes = ['wavy', 'asterisk', 'star', 'arrow', 'grid'];

        if (R.indexOf(trap.shape, trackedShapes) >= 0) {
          topic = trap.shape;
        } else {
          if (trap.shape === 'polygon') {
            if (trap.count === 4) {
              topic = 'square';
            } else if (trap.count === 3) {
              topic = 'triangle';
            }
          }
        }
      }

      if (!topic) {
        if (R.find((m) => m.name === 'grid trap', functal.modifierParams)) {
          topic = 'grid';
        }
      }


      if (!topic) {
        if (R.find((m) => m.name === 'box trap', functal.modifierParams)) {
          topic = 'square';
        }
      }

      if (!topic) {
        if (R.find((m) => m.name === 'circle trap', functal.modifierParams)) {
          topic = 'circle';
        }
      }

      if (!topic) {
        if (R.find((m) => m.name === 'spiral trap', functal.modifierParams)) {
          topic = 'spiral';
        }
      }

      if (!topic) {
        if (R.find((m) => m.name === 'sin', functal.modifierParams)) {
          topic = 'wavy';
        }
      }
    }

    //-------- try light/dark

    if (!topic && prob < 0.65) {

      if (functal.hslStats && functal.hslStats.l && functal.hslStats.l.mean > 0.7) {

        var lightTopics = ['light', 'sunshine'];

        topic = lightTopics[math.randomInt(0, lightTopics.length)];
      } else if (functal.hslStats && functal.hslStats.l && functal.hslStats.l.mean < 0.5) {
        var darkTopics = ['night', 'storm'];

        topic = darkTopics[math.randomInt(0, darkTopics.length)];
      }
    }

    //--------- else try color

    if (!topic && functal.hslStats && functal.hslStats.h && functal.hslStats.h.mode) {
      // based on most common hue
      topic = clr.getHueName(functal.hslStats.h.mode);
    }

    if (!topic) {
      console.log('unexpected lack of topic - force to watch');
      topic = 'watch';
    }

    return topic;
  };

  // http://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment

  function dist2(v, w) {

    return math.square(v.x - w.x) + math.square(v.y - w.y);
  }

  function distToSegmentSquared(p, v, w) {

    var l2 = dist2(v, w);

    if (l2 === 0) {
      return dist2(p, v);
    }

    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;

    if (t < 0) {
      return dist2(p, v);
    }

    if (t > 1) {
      return dist2(p, w);
    }

    return dist2(p, {
      x: v.x + t * (w.x - v.x),
      y: v.y + t * (w.y - v.y)
    });
  }

  function distToSegment(p, v, w) {

    return math.sqrt(distToSegmentSquared(p, v, w));
  }

  exports.modifiers = [{
      // final angle

      fn: function(functal) {

        var fn = R.curry(function(point, functal, result) {

          var vals = R.map(function(z) {

            var z1 = math.subtract(z, point);

            var x = math.atan2(z1.re, z1.im) / math.pi;

            return x;
          }, result.zs);

          return vals;
        });

        var point = math.complex(math.random(-functal.limit, functal.limit), math.random(-functal.limit, functal.limit));

        return {
          fn: fn(point),
          params: {
            name: 'angle',
            point: point
          }
        };
      },
      weight: 1,
    }, {
      fn: function(functal) {

        var fn = R.curry(function(offset, functal, result) {

          // just z.re

          var vals = R.map(function(z) {

            return z.re + offset;
          }, result.zs);

          return normalize(vals);
        });

        var offset = math.random(-functal.limit, functal.limit);

        return {
          fn: fn(offset),
          params: {
            name: 'real',
            offset: offset
          }
        };
      },
      weight: 1,
    },

    {
      fn: function( /* functal */ ) {

        var fn = R.curry(function(phase, functal, result) {

          // normalized z.re

          var max = math.max(R.map(function(z) {

            return math.abs(z.re);
          }, result.zs));

          var vals = R.map(function(z) {

            return adjx(max ? z.re / max : 1, offset);
          }, result.zs);

          return vals;
        });

        var offset = math.random(-1, 1);

        return {
          fn: fn(offset),
          params: {
            name: 'real',
            offset: offset
          }
        };
      },
      weight: 1,
    },

    {
      // norm
      fn: function( /* functal */ ) {

        var fn = R.curry(function(phase, functal, result) {

          var vals = R.map(function(z) {

            var x = functal.finite(math.norm(z)) / functal.limit;

            return adjx(x, offset);
          }, result.zs);

          return vals;
        });

        var offset = math.random(-1, 1);

        return {
          fn: fn(offset),
          params: {
            name: 'norm',
            offset: offset
          }
        };
      },
      weight: 1,
    },

    {
      // point trap

      fn: function(functal) {

        var fn = R.curry(function pointTrap(point, functal, result) {

          var vals = R.map(function(z) {

            var z1 = math.subtract(z, point);

            var distance = math.sqrt(functal.finite(math.norm(z1)));

            return distance;
          }, result.zs);

          return normalize(vals);
        });

        var point = math.complex(math.random(-functal.limit, functal.limit), math.random(-functal.limit, functal.limit));

        // return curried function with constant params

        return {
          fn: fn(point),
          params: {
            name: 'pointTrap',
            point: point
          }
        };
      },
      weight: 0.5,
    },

    {
      // vertical line trap

      fn: function(functal) {

        var fn = R.curry(function pointTrap(x, functal, result) {

          var vals = R.map(function(z) {

            var distance = math.abs(z.re - x);

            return distance;
          }, result.zs);

          return normalize(vals);
        });

        var x = math.random(-functal.limit, functal.limit);

        return {
          fn: fn(x),
          params: {
            name: 'vertical line trap',
            x: x
          }
        };
      },
      weight: 1,
    },

    {
      // horizontal line trap

      fn: function(functal) {

        var fn = R.curry(function pointTrap(y, functal, result) {

          var vals = R.map(function(z) {

            var distance = math.abs(z.im - y);

            return distance;
          }, result.zs);

          return normalize(vals);
        });

        var y = math.random(-functal.limit, functal.limit);

        return {
          fn: fn(y),
          params: {
            name: 'horizontal line trap',
            y: y
          }
        };
      },
      weight: 1,
    },

    {
      // grid trap
      // closest line to in a square grid

      fn: function( /* functal */ ) {

        var fn = R.curry(function gridTrap(lines, isCheckered, distancer, border, bounder, functal, result) {

          var vals = R.map(function(z) {

            var z1 = math.multiply(z, lines);
            var z2 = math.floor(z1);
            var z3;

            if (isCheckered && z2.re % 2 !== z2.im % 2) {
              z3 = z2;
            } else {
              z3 = math.subtract(z1, z2);
            }

            var z4 = math.divide(z3, lines);

            var distance = distancer.fn(z4, lines);

            return bounder.fn(distance, border);
          }, result.zs);

          return normalize(vals);
        });

        var lines = 1 + Rp.bandomInt(4, 1);

        var isCheckered = !!math.randomInt(2);

        var distancer = Rp.wandom(distancers).fn({});

        var border = math.random(1) / lines;

        var bounder = Rp.wandom(bounders).fn({
          maxDistance: border
        });

        return {
          fn: fn(lines, isCheckered, distancer, border, bounder),
          params: {
            name: 'grid trap',
            lines: lines,
            isCheckered: isCheckered,
            distancer: distancer,
            border: border,
            bounder: bounder
          }
        };
      },
      weight: 2,
    },

    {
      // box trap

      fn: function( /* functal */ ) {

        var fn = R.curry(function boxTrap(bounder, size, centre, functal, result) {

          var vals = R.map(function(z) {

            var z1 = math.subtract(z, centre);

            var x = math.abs(z1.re);
            var y = math.abs(z1.im);

            // furthest dimension from centre
            var distance = math.max(x, y);

            return bounder.fn(distance, size);
          }, result.zs);

          return normalize(vals);
        });

        var size = Rp.bandom(1, -2);
        var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());
        var bounder = Rp.wandom(bounders).fn({
          maxDistance: size
        });

        return {
          fn: fn(bounder, size, centre),
          params: {
            name: 'box trap',
            size: size,
            centre: centre,
            bounder: bounder
          }

        };
      },
      weight: 2,
    }, {
      // sin

      fn: function( /* functal */ ) {

        var fn = R.curry(function sinTrap(diameter, centre, ampl, freq, functal, result) {

          var vals = R.map(function(z) {

            return z.im + ampl * math.sin(freq * z.re);
          }, result.zs);

          return normalize(vals);
        });

        var diameter = Rp.bandom(1, -2);
        var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());
        var freq = Rp.bandom(2, 4);
        var ampl = math.random(0.5);

        return {
          fn: fn(diameter, centre, freq, ampl),
          params: {
            name: 'sin',
            diameter: diameter,
            centre: centre,
            freq: freq,
            ampl: ampl
          }
        };
      },
      weight: 1,
    }, {
      // real + a * imag - b

      name: 'linear',
      fn: function(functal) {

        var fn = R.curry(function reimTrap(a, b, functal, result) {

          var vals = R.map(function(z) {

            var y = functal.finite(z.im + a * z.re - b);

            return y;
          }, result.zs);

          return normalize(vals);
        });

        var a = math.random(-functal.limit, functal.limit);
        var b = math.random(-functal.limit, functal.limit);

        return {
          fn: fn(a, b),
          params: {
            name: 'linear',
            a: a,
            b: b
          }

        };
      },
      weight: 0.5,
    }, {
      // real * imag

      name: 'rebyim',
      fn: function( /* functal */ ) {

        var fn = R.curry(function reimTrap(offset, functal, result) {

          var vals = R.map(function(z) {

            var y = functal.finite(z.im * z.re) - offset;

            return y;
          }, result.zs);

          return normalize(vals);
        });

        var offset = Rp.bandom(1, -2);

        return {
          fn: fn(offset),
          params: {
            name: 'rebyim',
            offset: offset
          }

        };
      },
      weight: 1,
    },

    {
      // circle trap

      fn: function(functal) {

        var fn = R.curry(function circleTrap(bounder, diameter, centre, functal, result) {

          var vals = R.map(function(z) {

            var z1 = math.subtract(z, centre);

            var distance = math.sqrt(functal.finite(math.norm(z1)));

            return bounder.fn(distance, diameter);
          }, result.zs);

          return vals;
        });

        var diameter = Rp.bandom(functal.limit, -2);
        var centre = math.complex(math.random(-functal.limit, functal.limit), math.random(-functal.limit, functal.limit));
        var bounder = Rp.wandom(bounders).fn({
          maxDistance: diameter
        });

        // return curried function with constant params

        return {
          fn: fn(bounder, diameter, centre),
          params: {
            name: 'circle trap',
            centre: centre,
            diameter: diameter,
            bounder: bounder
          }
        };
      },
      weight: 2,
    },


    {
      // spiral trap

      name: 'spiral trap',
      fn: function(functal) {

        var fn = R.curry(function spiralTrap(bounder, diameter, freq, spirality, functal, result) {

          var pi2 = math.pi * 2;
          var d2 = diameter / pi2;
          var maxGap = diameter / 2;

          var vals = R.map(function(z) {

            var rz = math.norm(z);

            var theta = math.atan2(z.im, z.re); // -pi .. pi
            var thetaSpirality = theta * spirality;

            var minDistance = Number.MAX_VALUE;

            for (var f = 0; f < freq; f++) {
              var r = (thetaSpirality + f * pi2) * d2;

              var distance = math.abs(r - rz);

              minDistance = math.min(distance, minDistance);

              if (minDistance < maxGap) {
                break;
              }
            }

            return bounder.fn(minDistance, diameter);
          }, result.zs);

          return normalize(vals);
        });

        var freq = 1 + Rp.bandomInt(50, 3);
        var maxDiameter = Rp.bandom(functal.limit, 1);
        var diameter = maxDiameter / freq;
        var spirality = math.randomInt(2); // 0 = concentric circles, 1 = spiral

        var bounder = Rp.wandom(bounders).fn({
          maxDistance: diameter
        });

        return {
          fn: fn(bounder, diameter, freq, spirality),
          params: {
            name: 'spiral trap',
            diameter: diameter,
            freq: freq,
            spirality: spirality,
            bounder: bounder
          }

        };
      },
      weight: 4,
    },

    {
      // polygon trap

      fn: function( /*functal*/ ) {

        var fn = R.curry(function polygonTrap(lines, grid, bounder, functal, result) {

          var vals = R.map(function(z) {

            var z1 = math.multiply(z, grid);
            var z2 = math.fix(z1);

            // -1..1
            var z3 = math.chain(z1).subtract(z2).subtract(math.complex(0.5, 0.5)).multiply(2.0).done();

            var p = {
              x: z3.re,
              y: z3.im
            };

            var distance = R.reduceIndexed(function(min, line) {

              var dist = distToSegment(p, line.p1, line.p2);

              min = math.min(min, dist);

              return min;
            }, Number.MAX_VALUE, lines);

            return bounder.fn(distance, 0);
          }, result.zs);

          return normalize(vals);
        });

        // create shape

        var grid = 1 + Rp.bandomInt(4, 1); // repetition

        var shaper = Rp.wandom(shapers).fn();

        var shape = shaper.make();

        var bounder = bander({
          maxDistance: math.random(1)
        });

        return {
          fn: fn(shape.lines, grid, bounder),
          params: {
            name: 'shape trap',
            shape: shape.name,
            lines: shape.lines,
            count: shape.lines.length,
            params: shape.params,
            grid: grid,
            bounder: bounder
          }
        };
      },
      weight: 2,
    },
  ];
}());