(function()
{
    "use strict";

    var clr = require('./color');
    var pal = require('./palette');
    var math = require('mathjs');
    var R = require('ramda');

    //--------- blend modifiers onto base color

    var blend = function(functal, mods, result, palette)
    {
        // use [r, g, b]

        var base = R.values(clr.hsl2rgb(pal.getColor(palette, result.escape)));
        base = math.multiply(base, functal.baseLayer);

        // not being passed as an argument for unknown reason. check with ramda

        var blended = R.reduceIndexed(function(sum, mod, k)
        {
            var hsl = pal.getColor(palette, mod);

            var modColor = R.values(clr.hsl2rgb(hsl));

            modColor = math.multiply(modColor, functal.layers[k]);

            return math.add(sum, modColor);

        }, base, mods);

        blended = math.floor(blended);

        var rgb = R.zipObj(['r', 'g', 'b'], blended);

        return rgb;
    };

    //------------ sum the values & use as index

    var direct = function(functal, mods, result, palette)
    {
        var k = 0;

        var total = R.reduce(function(sum, mod)
        {
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
        weight: 85,
        getColor: blend
    },
    {
        name: 'direct',
        weight: 15,
        getColor: direct
    }
    ];

})();
