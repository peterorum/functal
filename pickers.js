(function() {

  "use strict";

  var clr = require('./color');
  var pal = require('./palette');
  var mixers = require('./mixers');
  var math = require('mathjs');
  var R = require('ramda');
  var Rp = require('./plus-fp/plus-fp');

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

    rgb = pal.fixColor(rgb);

    return rgb;
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

  var getMixers = function(modifiers) {
    return R.map(function() {
      return Rp.wandom(mixers.mixers);
    }, modifiers);
  };

  //--------- exports

  exports.pickers = [
    {
      name: 'blend',
      weight: 100,
      getColor: blend,
      getMixers: () => {}
    },
    {
      name: 'direct',
      weight: 20, // too easily picked
      getColor: direct,
      getMixers: () => {}
    },
    {
      name: 'mix',
      weight: 50,
      getColor: mixers.mix,
      getMixers: (modifiers) => getMixers(modifiers)
    }
  ];

})();
