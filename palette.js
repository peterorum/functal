(function() {

  "use strict";

  var math = require('mathjs');
  var clr = require('./color');

  var R = require('ramda');
  var Rp = require('./plus-fp/plus-fp');

  var minHslStats = {
    h: {
      std: 0.2
    },
    s: {
      std: 0.2
    },
    l: {
      std: 0.2,
      max: 0.9
    },
    i: // intensity
    {
      max: 0.8
    }
  };

  var getIntensity = function(hsl) {

    // intensity (max sat at 0.5 l)
    var il = 1 - 2 * math.abs(0.5 - hsl.l); // 0.5 = 1, 0,1 = 0

    return il * hsl.s;
  };

  var selectHue = function(except, wues) {

    var baseHue = Rp.wandomExcept(except, wues).hue;

    var hueFrom = -0.5;
    var hueTo = 0.5;

    var hue = math.mod(baseHue + math.random(hueFrom, hueTo) / 12, 1);

    // skip dull orange. no 0.4 to 0.83333
    // go more red

    if (hue > 0.4 / 12 && hue < 0.8333 / 12) {
      hue -= 0.4333 / 12;
      hue = math.mod(hue, 1);
    }

    return hue;
  };

  var fixColor = function(rgb) {

    // make color acceptable;

    let changed = false;

    var hsl = clr.rgb2hsl(rgb);

    var h12 = hsl.h * 12;

    if (h12 >= 0.33 && h12 <= 2) {
      // less brown
      changed = true;

      // more saturated & light

      hsl.s = 0.75 + hsl.s * 0.25;
      hsl.l = 0.50 + hsl.l * 0.50;
    }

    return (changed ? clr.hsl2rgb(hsl) : rgb);
  };

  // todo: try eliminating fn by returning a function & adding properties to the function
  // don't use "name" - doesn't work

  var schemes = [
    {
      fn: function() {

        return {
          name: "analagous complimentary",
          fn: function(palette, wues) {

            // analogous complementary color scheme (adjacents & complemt)

            var hue = selectHue([], wues);

            palette.mainHue = hue * 12;

            var hues = [];

            hues.push(
              {
                h: hue,
                weight: 100
              });

            // delta to next hue
            var d = 1 / 12;

            // adjacent
            hues.push(
              {
                h: math.mod(hue - 1 * d, 1),
                weight: 25
              });

            // adjacent

            hues.push(
              {
                h: math.mod(hue + 1 * d, 1),
                weight: 25
              });

            // complement
            hues.push(
              {
                h: math.mod(hue + 6 * d, 1),
                weight: 50
              });

            return hues;
          }
        };
      },
      weight: 100
    },

    {
      fn: function() {

        return {
          name: "split complimentary",
          fn: function(palette, wues) {

            // no red+green
            var hue = selectHue([0, 7, 11], wues);

            palette.mainHue = hue * 12;

            var hues = [];


            // delta to next hue
            var d = 1 / 12;

            hues.push(
              {
                h: hue,
                weight: 100
              });

            // adjacent to complimentary
            hues.push(
              {
                h: math.mod(hue + 5 * d, 1),
                weight: 25
              });

            // adjacent to complimentary

            hues.push(
              {
                h: math.mod(hue + 7 * d, 1),
                weight: 25
              });

            return hues;
          }
        };
      },
      weight: 100
    },
    {
      fn: function() {

        return {
          name: "analagous",
          fn: function(palette, wues) {

            var hue = selectHue([], wues);

            palette.mainHue = hue * 12;

            var hues = [];

            // delta to next hue
            var d = 1 / 12;

            hues.push(
              {
                h: hue,
                weight: 100
              });

            // adjacent
            hues.push(
              {
                h: math.mod(hue - 1 * d, 1),
                weight: 50
              });

            // adjacent

            hues.push(
              {
                h: math.mod(hue + 1 * d, 1),
                weight: 50
              });

            return hues;
          }
        };
      },
      weight: 0 // 20 not enough hue stddev
    },

    {
      fn: function() {

        return {
          name: "triad",
          fn: function(palette, wues) {

            var hue = selectHue([], wues);

            palette.mainHue = hue * 12;

            var hues = [];

            hues.push(
              {
                h: hue,
                weight: 100
              });

            hues.push(
              {
                h: math.mod(hue + 0.3333, 1),
                weight: 50
              });

            hues.push(
              {
                h: math.mod(hue - 0.3333, 1),
                weight: 50
              });

            return hues;
          }
        };
      },
      weight: 10
    },
    {
      fn: function() {

        return {
          name: "tetrad",
          fn: function(palette, wues) {

            var hue = selectHue([], wues);

            palette.mainHue = hue * 12;

            var hues = [];

            hues.push(
              {
                h: hue,
                weight: 100
              });

            for (var i = 1; i < 4; i++) {

              hues.push(
                {
                  h: math.mod(hue + i / 4, 1),
                  weight: 50
                });
            }

            return hues;
          }
        };
      },
      weight: 5
    },
    {
      fn: function() {

        return {
          name: "tetradic",
          fn: function(palette, wues) {

            var hue = selectHue([], wues);

            palette.mainHue = hue * 12;

            var hues = [];

            hues.push(
              {
                h: hue,
                weight: 100
              });

            // complimentary
            hues.push(
              {
                h: math.mod(hue + 0.5, 1),
                weight: 25
              });

            // along a couple
            hues.push(
              {
                h: math.mod(hue + 2 / 12, 1),
                weight: 25
              });

            // its complimentary
            hues.push(
              {
                h: math.mod(hue + 8 / 12, 1),
                weight: 25
              });

            return hues;
          }
        };
      },
      weight: 5
    }

  ];

  var calcHslStats = function(hsls) {

    var hslkeys = ['h', 's', 'l', 'i'];

    var statFns = ['std', 'mean', 'median', 'min', 'max'];

    var hslStats = {};

    R.forEach(function(hslkey) {

      hslStats[hslkey] = R.zipObj(statFns, R.map(function(statFn) {

        var x = math[statFn](R.map(function(hsl) {

          return hsl[hslkey];
        }, hsls));

        return math.round(x, 3);
      }, statFns));


    }, hslkeys);

    hslStats.h.mode = calcHueMode(hsls);

    return hslStats;
  };

  var calcHueMode = function(hsls) {

    var dist = R.map(function() {

      return 0;
    }, R.range(0, 25));

    R.forEach(function(hsl) {

      // todo : sometimes h is NaN
      // 0..24

      var h = math.round(hsl.h * 12 * 2);

      if (dist[h]) {

        dist[h] += 1;
      }
      else {

        dist[h] = 1;
      }
    }, hsls);

    var max = math.max(dist);

    var mode = R.findIndex(function(h) {

      return h === max;
    }, dist);

    // 0..12
    mode = mode / 2;

    return mode;
  };

  var isHueModeOk = function(h12) {

    // no green
    var ok = !(h12 >= 2 && h12 < 6);

    // no purple
    ok = ok && !(h12 >= 8.5 && h12 <= 11);

    return ok;
  };

  // determine colors within the band

  var interpolateColors = function(rgb1, rgb2, gap, i) {

    // calc gradient between 2 colors
    var rgb = {
      r: math.round(rgb1.r + (rgb2.r - rgb1.r) / gap * i),
      g: math.round(rgb1.g + (rgb2.g - rgb1.g) / gap * i),
      b: math.round(rgb1.b + (rgb2.b - rgb1.b) / gap * i)
    };

    // store hsl for easier later adjustment
    var hsl = clr.rgb2hsl(rgb);

    return hsl;
  };

  var getLightness = function(index, hue /*, contrast */) {

    var l;
    // alternate bright/dark bands
    // var l = Rp.bandom(1, (index % 2) ? contrast : -contrast);

    var h12 = hue * 12;

    // brighter orange
    if (h12 >= 1 && h12 <= 2) {
      l = Rp.bandom(1, -3);
    }
    else {
      l = Rp.bandom(1, 1);
    }

    return l;
  };

  var getSaturation = function(hue) {

    // brightish
    var s = Rp.bandom(1, -2);

    var h12 = hue * 12;

    // brighter orange
    if (h12 > 1 && h12 < 2) {

      s = Rp.bandom(1, -2);
    }

    return s;
  };

  var interpolateWithBlackLine = function(rgb1, rgb2, gap, i, palette) {

    var hsl;

    if (i < palette.colors.length / 1000) {

      hsl = {
        h: 0,
        s: 0,
        l: 0
      };
    }
    else {

      hsl = interpolateColors(rgb1, rgb2, gap, i);
    }

    return hsl;
  };

  var solidColors = function(rgb1 /*, rgb2, gap, i*/ ) {

    // just a single color

    var hsl = clr.rgb2hsl(rgb1);

    return hsl;
  };

  // color band

  var bands = [
    {
      // gradient

      name: "gradient",
      fn: function() {

        var fn = function(palette, hues, index) {

          var hue = Rp.wandom(hues).h;

          var hsl = {
            h: hue,
            s: getSaturation(hue),
            l: getLightness(index, hue, palette.contrast)
          };

          return hsl;
        };

        return {
          name: "gradient",
          fn: fn,
          bandColor: interpolateColors
        };
      },
      weight: 500
    },
    {
      // gradient with black line

      name: "black line",
      fn: function() {

        var fn = function(palette, hues, index) {

          var hue = Rp.wandom(hues).h;

          var hsl = {
            h: hue,
            s: getSaturation(hue),
            l: getLightness(index, hue, palette.contrast)
          };

          return hsl;
        };

        return {
          name: "black line",
          fn: fn,
          bandColor: interpolateWithBlackLine
        };
      },
      weight: 25
    },
    {
      // blackness

      fn: function() {

        var fn = R.curry(function(blackness, palette, hues, index) {

          var hsl = {
            h: Rp.wandom(hues).h,
            // v brightish
            s: Rp.bandom(1, -3),
            // sparse light & more black
            l: Rp.bandom(1, index % palette.blackness === 0 ? -3 : 10)
          };

          return hsl;
        });

        var blackness = 2 + Rp.bandomInt(6, 1);

        return {
          name: 'blackness',
          fn: fn(blackness),
          blackness: blackness,
          bandColor: interpolateColors
        };
      },
      weight: 25
    },
    {
      // solid
      name: "solid",
      fn: function() {

        var fn = function(palette, hues /*, index*/ ) {

          var hsl = {
            h: Rp.wandom(hues).h,
            s: Rp.bandom(1, 1),
            l: math.random(1)
          };

          return hsl;
        };

        return {
          name: "solid",
          fn: fn,
          bandColor: solidColors
        };
      },

      weight: 0.1
    }];

  // ------------ make color palette

  exports.setPalette = function() {

    var palette = {};

    var size = 4096;

    // keep trying until acceptable palette

    var ok = false;

    // weighted hues giving emphasis on more orange, blue, less magenta
    var wues = [
      {
        // warm red
        hue: 0 / 12,
        weight: 25
      },
      {
        // orange
        hue: 1 / 12,
        weight: 20
      },
      {
        // yellow
        hue: 2 / 12,
        weight: 10
      },
      {
        // lime green
        hue: 3 / 12,
        weight: 1
      },
      {
        // bright green
        hue: 4 / 12,
        weight: 1
      },
      {
        // light green
        hue: 5 / 12,
        weight: 1
      },
      {
        // cyan
        hue: 6 / 12,
        weight: 10
      },
      {
        // cool blue
        hue: 7 / 12,
        weight: 50
      },
      {
        // warm blue
        hue: 8 / 12,
        weight: 40
      },
      {
        // violet
        hue: 9 / 12,
        weight: 1
      },
      {
        // magenta
        hue: 10 / 12,
        weight: 1
      },
      {
        // cool red
        hue: 11 / 12,
        weight: 10
      }];

    do {

      palette.colors = [];

      // set the number of different colors to use
      palette.numColors = 2 + Rp.bandomInt(24, -2);

      palette.scheme = Rp.wandom(schemes).fn();

      // allocate a different amount of each color
      var weights = math.random([palette.numColors]);

      // sum the weights to normalize them
      var sum = R.reduce(function(sum, n) {

        return sum + n;
      }, 0, weights);

      var hues = palette.scheme.fn(palette, wues);

      // calc how many palette entries each color will have, and set a random color for this gap

      // todo: map is supposed to get index
      var index = 0;

      palette.contrast = Rp.bandomInt(5, 3);
      palette.getColor = Rp.wandom(bands).fn();

      var gaps = R.map(function(n) {

        var gap = {
          gap: math.max(1, math.round(n / sum * size)), // number of palette entries
          color: palette.getColor.fn(palette, hues, index)
        };

        index++;

        return gap;
      }, weights);

      // adj last one so that sum is exactly size
      R.last(gaps).gap += math.max(0, (size - R.reduce(function(sum, n) {

          return sum + n;
        }, 0, R.pluck('gap', gaps))));

      R.forEachIndexed(function(g, k) {

        // color in the gap is a gradient from one color to the next, wrapping at the end
        var rgb1 = clr.hsl2rgb(g.color);
        var rgb2 = clr.hsl2rgb(gaps[(k + 1) % gaps.length].color);

        R.times(function(i) {

          var hsl = palette.getColor.bandColor(rgb1, rgb2, g.gap, i, palette);

          hsl.i = getIntensity(hsl);

          palette.colors.push(hsl);
        }, g.gap);

      }, gaps);

      palette.hslStats = calcHslStats(palette.colors);

      ok =
        palette.hslStats.h.std > minHslStats.h.std &&
        palette.hslStats.l.std > minHslStats.l.std &&
        palette.hslStats.s.std > minHslStats.s.std &&
        palette.hslStats.l.max > minHslStats.l.max &&
        palette.hslStats.i.max > minHslStats.i.max &&
        isHueModeOk(palette.hslStats.h.mode);

    } while (!ok);

    palette.size = palette.colors.length - 1;

    exports.getColorIndex = function(size, color) {

      return math.floor(color * size);
    };

    exports.getColor = function(palette, color) {

      // color 0..1

      var index = exports.getColorIndex(palette.size, color);

      return palette.colors[math.mod(index, palette.size)];
    };

    exports.getExpectedHslStats = function() {

      return minHslStats;
    };

    exports.getIntensity = getIntensity;
    exports.calcHslStats = calcHslStats;
    exports.isHueModeOk = isHueModeOk;
    exports.fixColor = fixColor;

    return palette;
  };

}());
