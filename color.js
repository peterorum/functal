(function() {
  "use strict";

  var math = require('mathjs');

  var h2rgb = function(f1, f2, h) {
    var rgb = f1;

    if (h < 0) {
      h += 1.0;
    }

    if (h > 1) {
      h -= 1.0;
    }

    if (6.0 * h < 1) {
      rgb = (f1 + (f2 - f1) * h * 6.0);
    } else if (2.0 * h < 1) {
      rgb = f2;
    } else if (3.0 * h < 2.0) {
      rgb = (f1 + (f2 - f1) * ((2.0 / 3.0) - h) * 6.0);
    }

    return rgb;
  };

  exports.hsl2rgb = function(hsl) {
    // hsl are all 0..1

    var h = hsl.h;
    var s = hsl.s;
    var l = hsl.l;

    h = math.mod(h, 1);
    s = math.mod(s, 1);
    l = math.mod(l, 1);

    var r, g, b;

    if (s === 0) {
      r = g = b = l; // gray
    }
    else {
      var f2;

      if (l <= 0.5) {
        f2 = l * (1.0 + s);
      }
      else {
        f2 = l + s - l * s;
      }

      var f1 = 2.0 * l - f2;

      r = h2rgb(f1, f2, h + 1.0 / 3.0);
      g = h2rgb(f1, f2, h);
      b = h2rgb(f1, f2, h - 1.0 / 3.0);
    }

    var rgb = {
      r: Math.floor(r * 255),
      g: Math.floor(g * 255),
      b: Math.floor(b * 255),
    };

    return rgb;
  };

  exports.rgb2hsl = function(rgb) {
    // rgb are all 0..255

    var r = rgb.r / 255.0;
    var g = rgb.g / 255.0;
    var b = rgb.b / 255.0;

    var fMax = math.max(r, math.max(g, b));
    var fMin = math.min(r, math.min(g, b));

    var h = 0;
    var s = 0;
    var l = (fMax + fMin) / 2.0;

    if (fMax === fMin) {
      s = 0.0;
      h = 0.0;
    }
    else {
      if (l < 0.5) {
        s = (fMax - fMin) / (fMax + fMin);
      }
      else {
        s = (fMax - fMin) / (2.0 - fMax - fMin);
      }

      var fDelta = fMax - fMin;

      if (r === fMax) {
        h = (g - b) / fDelta;
      } else if (g === fMax) {
        h = 2.0 + (b - r) / fDelta;
      }
      else {
        h = 4.0 + (r - g) / fDelta;
      }

      h /= 6.0;

      if (h < 0.0) {
        h += 1.0;
      }
    }

    var hsl = {
      h: h,
      s: s,
      l: l
    };

    return hsl;
  };

  exports.rgb1 = function(rgb) {
    // rgb are all 0..255
    // return 0..1

    return {
      r: rgb.r / 255.0,
      g: rgb.g / 255.0,
      b: rgb.b / 255.0
    };
  };

  exports.rgb255 = function(rgb) {
    return {
      r: rgb.r * 255.0,
      g: rgb.g * 255.0,
      b: rgb.b * 255.0
    };
  };

  exports.random = function() {
    var hsl = {
      h: math.random(1),
      s: math.random(1),
      l: math.random(1),
    };

    return hsl;
  };

  exports.getHueName = function(h12) {

    var hues = [['red'], ['orange', 'sunset'], ['yellow', 'gold', 'golden'], ['green'], ['green'], ['green', 'jade', 'turquoise'], ['sky', 'cyan' ], ['blue'], ['blue'], ['purple', 'violet'], ['magenta'], ['pink', 'rose', 'crimson', 'ruby' ]];

    var hue = hues[math.mod(math.round(h12 || 0), 12) ];

    hue = hue[ math.randomInt(hue.length)];

    return hue;
  };


})();
