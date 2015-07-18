(function() {

  "use strict";

  var clr = require('./color');
  var pal = require('./palette');
  var math = require('mathjs');
  var R = require('ramda');

  //--------- blend modifiers onto base color

  var blend = function(functal, mods, result, palette) {

    // use [r, g, b]

    var base = R.values(clr.hsl2rgb(pal.getColor(palette, result.escape)));
    base = math.multiply(base, functal.baseLayer);

    var blended = R.reduceIndexed(function(sum, mod, k) {

      var hsl = pal.getColor(palette, mod);

      var modColor = R.values(clr.hsl2rgb(hsl));

      modColor = math.multiply(modColor, functal.layers[k]);

      return math.add(sum, modColor);

    }, base, mods);

    blended = math.floor(blended);

    var rgb = R.zipObj(['r', 'g', 'b'], blended);

    return rgb;

  };

  //--------- modifiers adjust lightness of base color

  var adjustLightness = function(functal, mods, result, palette) {

    var baseHsl = pal.getColor(palette, result.escape);

    var modHsl = R.reduceIndexed(function(hsl, mod, k) {

      mod *= functal.layers[k] * 0.05;

      mod = math.max(-1, math.min(1, mod));

      if (mod > 0) {
        hsl.l = hsl.l + (1 - hsl.l) * mod;
      }
      else {
        hsl.l = hsl.l + (hsl.l) * mod;
      }

      return hsl;

    }, baseHsl, mods);

    return clr.hsl2rgb(modHsl);

  };

  //------------ sum the values & use as index

  var direct = function(functal, mods, result, palette) {

    var k = 0;

    var total = R.reduce(function(sum, mod) {

      return sum + mod * functal.layers[k++];

    }, result.escape * functal.baseLayer, mods);

    var hsl = pal.getColor(palette, total);
    var rgb = clr.hsl2rgb(hsl);

    return rgb;

  };


  //--------- exports

  exports.pickers = [
    {
      name: 'blend',
      weight: 100,
      getColor: blend
    },
    {
      name: 'direct',
      weight: 20,
      getColor: direct
    },
    {
      name: 'adjust lightness',
      weight: 0, //////////////////////////////////////////
      getColor: adjustLightness
    }
  ];

})();
