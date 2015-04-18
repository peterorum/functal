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

        var base = R.values(clr.hsl2rgb(pal.getColor(palette, result.escape, functal.baseOffset)));
        base = math.multiply(base, functal.baseLayer);

        // not being passed as an argument for unknown reason. check with ramda
        var k = 0;

        var blended = R.reduce(function(sum, mod)
        {
            var hsl = pal.getColor(palette, mod, functal.layerOffsets[k]);

            var modColor = R.values(clr.hsl2rgb(hsl));

            modColor = math.multiply(modColor, functal.layers[k]);

            k++;

            return math.add(sum, modColor);

        }, base, mods);

        blended = math.floor(blended);

        var rgb = R.zipObj(['r', 'g', 'b'], blended);

        return rgb;
    };

    var blendOffsets = function(functal, mods, result, palette)
    {
        functal.baseOffset = palette.lightestIndex - pal.getColorIndex(palette.size, result.escape);

        functal.layerOffsets = R.map(function(m)
        {
            // console.log(palette.lightestIndex, pal.getColorIndex(palette.size, m), palette.lightestIndex - pal.getColorIndex(palette.size, m));
            return palette.lightestIndex - pal.getColorIndex(palette.size, m);

        }, mods);
    };

    //------------ sum the values & use as index

    var direct = function(functal, mods, result, palette)
    {
        var k = 0;

        var total = R.reduce(function(sum, mod)
        {
            return sum + mod * functal.layers[k++];

        }, result.escape * functal.baseLayer, mods);

        var hsl = pal.getColor(palette, total, functal.baseOffset);
        var rgb = clr.hsl2rgb(hsl);

        return rgb;
    };

    var directOffsets = function(functal, mods, result, palette)
    {
        var k = 0;

        var total = R.reduce(function(sum, mod)
        {
            return sum + mod * functal.layers[k++];

        }, result.escape * functal.baseLayer, mods);

        functal.baseOffset = palette.lightestIndex - pal.getColorIndex(palette.size, total);
    };

    //--------- exports

    exports.pickers = [
    {
        name: 'blend',
        weight: 85,
        getColor: blend,
        setOffsets: blendOffsets
    },
    {
        name: 'direct',
        weight: 15,
        getColor: direct,
        setOffsets: directOffsets
    }
    ];

})();
