(function() {

  "use strict";

  var clr = require('./color');
  var pal = require('./palette');
  var math = require('mathjs');
  var R = require('ramda');

  //--------- mixers

  var minl = function(hsl1, hsl2) {

    // min lightness

    var hsl = {
      h: hsl1.h,
      s: hsl1.s,
      l: math.min(hsl1.l, hsl2.l)
    };

    return hsl;
  };

  var maxl = function(hsl1, hsl2) {

    // max lightness

    var hsl = {
      h: hsl1.h,
      s: hsl1.s,
      l: math.max(hsl1.l, hsl2.l)
    };

    return hsl;
  };

  var minmaxs = function(hsl1, hsl2, minmax) {

    // saturation

    var hsl = {
      h: hsl1.h,
      s: hsl1.s,
      l: minmax(hsl1.l, hsl2.l)
    };

    return hsl;
  };

  var mins = function(hsl1, hsl2) {

    return minmaxs(hsl1, hsl2, math.min);
  };

  var maxs = function(hsl1, hsl2) {

    return minmaxs(hsl1, hsl2, math.max);
  };

  var hue2 = function(hsl1, hsl2) {

    var hsl = {
      h: hsl2.h,
      s: hsl1.s,
      l: hsl1.l
    };

    return hsl;
  };

  var saturation2 = function(hsl1, hsl2) {

    var hsl = {
      h: hsl1.h,
      s: hsl2.s,
      l: hsl1.l
    };

    return hsl;
  };

  var lightness2 = function(hsl1, hsl2) {

    var hsl = {
      h: hsl1.h,
      s: hsl1.s,
      l: hsl2.l
    };

    return hsl;
  };

  var multiply = function(hsl1, hsl2) {
    // darkens

    var rgb1 = clr.rgb1(clr.hsl2rgb(hsl1));
    var rgb2 = clr.rgb1(clr.hsl2rgb(hsl2));

    var rgb = {
      r: rgb1.r * rgb2.r,
      g: rgb1.g * rgb2.g,
      b: rgb1.b * rgb2.b
    };

    rgb = clr.rgb255(rgb);

    return clr.rgb2hsl(rgb);
  };

  var screen = function(hsl1, hsl2) {
    // lightens

    var rgb1 = clr.rgb1(clr.hsl2rgb(hsl1));
    var rgb2 = clr.rgb1(clr.hsl2rgb(hsl2));

    var rgb = {
      r: 1 - (1 - rgb1.r) * (1 - rgb2.r),
      g: 1 - (1 - rgb1.g) * (1 - rgb2.g),
      b: 1 - (1 - rgb1.b) * (1 - rgb2.b)
    };

    rgb = clr.rgb255(rgb);

    return clr.rgb2hsl(rgb);
  };

  var average = function(hsl1, hsl2) {

    var rgb1 = clr.hsl2rgb(hsl1);
    var rgb2 = clr.hsl2rgb(hsl2);

    var rgb = {
      r: (rgb1.r + rgb2.r) / 2,
      g: (rgb1.g + rgb2.g) / 2,
      b: (rgb1.b + rgb2.b) / 2
    };

    return clr.rgb2hsl(rgb);
  };

  //--------- mix modifier colors onto base color

  var mix = function(functal, mods, result, palette) {

    // hsl
    var base = pal.getColor(palette, result.escape);

    var mixed = R.reduceIndexed(function(modColor, mod, k) {

      var hsl = pal.getColor(palette, mod);

      return functal.mixers[k].mix(modColor, hsl);
    }, base, mods);

    var rgb = clr.hsl2rgb(mixed);

    return rgb;
  };

  var averagel = function(hsl1, hsl2) {

    // ave lightness

    var hsl = {
      h: hsl1.h,
      s: hsl1.s,
      l: (hsl1.l + hsl2.l) / 2
    };

    return hsl;
  };

  var averages = function(hsl1, hsl2) {

    // ave saturation

    var hsl = {
      h: hsl1.h,
      s: (hsl1.s + hsl2.s) / 2,
      l: hsl1.l
    };

    return hsl;
  };

  var differencel = function(hsl1, hsl2) {

    // lightness difference

    var hsl = {
      h: hsl1.h,
      s: hsl1.s,
      l: math.abs(hsl1.l - hsl2.l)
    };

    return hsl;
  };
  //--------- exports

  exports.mixers = [
    {
      name: 'min lightness',
      weight: 100,
      mix: minl
    },
    {
      name: 'max lightness',
      weight: 10,
      mix: maxl
    },
    {
      name: 'max saturation',
      weight: 100,
      mix: maxs
    },
    {
      name: 'min saturation',
      weight: 10,
      mix: mins
    },
    {
      name: 'hue 2',
      weight: 100,
      mix: hue2
    },
    {
      name: 'saturation 2',
      weight: 100,
      mix: saturation2
    },
    {
      name: 'lightness 2',
      weight: 100,
      mix: lightness2
    },
    {
      name: 'multiply',
      weight: 100,
      mix: multiply
    },
    {
      name: 'screen',
      weight: 10,
      mix: screen
    },
    {
      name: 'average',
      weight: 100,
      mix: average
    },
    {
      name: 'average lightness',
      weight: 100,
      mix: averagel
    },
    {
      name: 'average saturation',
      weight: 100,
      mix: averages
    },
    {
      name: 'lightness difference',
      weight: 100,
      mix: differencel
    }
  ];

  exports.mix = mix;

})();
