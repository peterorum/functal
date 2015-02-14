(function()
{
    "use strict";

    var math = require('mathjs');
    var clr = require('./color');
    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    // ------------ make color palette

    exports.setPalette = function()
    {
        var palette = {};

        var size = 4096;

        // keep trying until acceptable palette

        var ok = false;

        // weighted hues giving emphasis on more orange, blue, less magenta
        var wues = [
        {
            // warm red
            hue: 0 / 12,
            weight: 50
        },
        {
            // orange
            hue: 1 / 12,
            weight: 200
        },
        {
            // yellow
            hue: 2 / 12,
            weight: 40
        },
        {
            // lime green
            hue: 3 / 12,
            weight: 0
        },
        {
            // bright green
            hue: 4 / 12,
            weight: 0
        },
        {
            // light green
            hue: 5 / 12,
            weight: 0
        },
        {
            // cyan
            hue: 6 / 12,
            weight: 20,
        },
        {
            // cool blue
            hue: 7 / 12,
            weight: 80
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
            weight: 0
        },
        {
            // cool red
            hue: 11 / 12,
            weight: 1
        }];

        do {
            palette.colors = [];

            // set the number of differnet colors to use
            palette.numColors = math.randomInt(2, 16);

            // allocate a different amount of each color
            var weights = math.random([palette.numColors]);

            // sum the weights to normalize them
            var sum = fp.reduce(function(sum, n)
            {
                return sum + n;
            }, 0, weights);

            // analogous complementray color scheme (adjacents & complemt)
            var hues = [];

            var hue = fp.wandom(wues).hue;
            hue = math.mod(hue + math.random(-0.5, 0.5) / 12, 1);

            palette.mainHue = hue * 12;

            // delta to next hue
            var d = 1 / 12;

            hues.push(hue);
            hues.push(math.mod(hue - 1 * d, 1)); // adjacent
            hues.push(math.mod(hue + 1 * d, 1)); // adjacent
            hues.push(math.mod(hue + 6 * d, 1)); // complement

            // console.log(fp.map(function(h){ return h * 12;}, hues));

            // calc how many palette entries each color will have, and set a random color for this gap
            var gaps = fp.map(function(n)
            {
                var gap = {
                    gap: math.max(1, math.round(n / sum * size)), // number of palette entries
                    color:
                    {
                        h: math.pickRandom(hues),
                        s: math.random(1),
                        l: math.random(1)
                    }
                };

                return gap;

            }, weights);

            // adj last one so that sum is exactly size
            fp.last(gaps).gap += (size - fp.reduce(function(sum, n)
            {
                return sum + n;
            }, 0, fp.pluck('gap', gaps)));

            fp.forEach(function(g, k)
            {
                // color in the gap is a gradient from one color to the next, wrapping at the end
                var rgb1 = clr.hsl2rgb(g.color);
                var rgb2 = clr.hsl2rgb(gaps[(k + 1) % gaps.length].color);

                fp.range(0, g.gap).forEach(function(i)
                {
                    // calc gradient between 2 colors
                    var rgb = {
                        r: math.round(rgb1.r + (rgb2.r - rgb1.r) / g.gap * i),
                        g: math.round(rgb1.g + (rgb2.g - rgb1.g) / g.gap * i),
                        b: math.round(rgb1.b + (rgb2.b - rgb1.b) / g.gap * i)
                    };

                    palette.colors.push(rgb);
                });
            }, gaps);

            // calc lightness std dev
            palette.stdDevL = math.std(fp.map(function(p)
            {
                return clr.rgb2hsl(p).l;
            }, palette.colors));

            ok = palette.stdDevL > 0.2;

        }
        while (!ok);

        return palette;
    };

}());
