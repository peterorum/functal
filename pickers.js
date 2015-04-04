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
            return palette.lightestIndex - pal.getColorIndex(palette.size, m);

        }, mods);
    };

    //--------- lightness modifiers onto base color

    var lightness = function(functal, mods, result, palette)
    {
        var base = R.values(clr.hsl2rgb(pal.getColor(palette, result.escape, functal.baseOffset)));
        // base = math.multiply(base, functal.baseLayer);

        var rgb = R.zipObj(['r', 'g', 'b'], base);
        var hsl = clr.rgb2hsl(rgb);

        R.forEachIndexed(function(mod, k)
        {
            hsl.l += mod / 2 * functal.layers[k];
            hsl.l = math.mod(hsl.l, 1);

        }, mods);

        rgb = clr.hsl2rgb(hsl);

        return rgb;
    };

    var lightnessOffsets = function(functal, mods, result, palette)
    {
        functal.baseOffset = palette.lightestIndex - pal.getColorIndex(palette.size, result.escape);
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

    //--------- average modifiers onto base color

    var average = function(functal, mods, result, palette)
    {
        // use [r, g, b]

        var base = R.values(clr.hsl2rgb(pal.getColor(palette, result.escape, functal.baseOffset)));

        var averaged = R.reduceIndexed(function(sum, mod, k)
        {
            var hsl = pal.getColor(palette, mod, functal.layerOffsets[k]);

            var modColor = R.values(clr.hsl2rgb(hsl));

            return math.add(sum, modColor);

        }, base, mods);

        averaged = math.divide(averaged, 1 + mods.length);

        averaged = math.floor(averaged);

        var rgb = R.zipObj(['r', 'g', 'b'], averaged);

        return rgb;
    };

    var averageOffsets = function(functal, mods, result, palette)
    {
        functal.baseOffset = palette.lightestIndex - pal.getColorIndex(palette.size, result.escape);

        functal.layerOffsets = R.map(function(m)
        {
            return palette.lightestIndex - pal.getColorIndex(palette.size, m);

        }, mods);
    };

    //--------- blend modifiers onto base color

    var blend2 = function(functal, mods, result, palette)
    {
        // use [r, g, b]

        var factor = 1 / (1 + mods.length);

        var base = R.values(clr.hsl2rgb(pal.getColor(palette, result.escape, functal.baseOffset)));
        base = math.multiply(base, factor);

        // not being passed as an argument for unknown reason. check with ramda
        var k = 0;

        var blend2ed = R.reduce(function(sum, mod)
        {
            var hsl = pal.getColor(palette, mod, functal.layerOffsets[k]);

            var modColor = R.values(clr.hsl2rgb(hsl));

            modColor = math.multiply(modColor, factor);

            k++;

            return math.add(sum, modColor);

        }, base, mods);

        blend2ed = math.floor(blend2ed);

        var rgb = R.zipObj(['r', 'g', 'b'], blend2ed);

        return rgb;
    };

    var blend2Offsets = function(functal, mods, result, palette)
    {
        functal.baseOffset = palette.lightestIndex - pal.getColorIndex(palette.size, result.escape);

        functal.layerOffsets = R.map(function(m)
        {
            return palette.lightestIndex - pal.getColorIndex(palette.size, m);

        }, mods);
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
    },
    {
        name: 'lightness',
        weight: 0,
        getColor: lightness,
        setOffsets: lightnessOffsets
    },
    {
        name: 'average',
        weight: 0,
        getColor: average,
        setOffsets: averageOffsets
    },
    {
        name: 'blend2',
        weight: 0,
        getColor: blend2,
        setOffsets: blend2Offsets
    },

    ];

})();
