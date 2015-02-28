(function()
{
    "use strict";

    var math = require('mathjs');
    var clr = require('./color');
    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    // find the index of the lightest color

    var findLighestIndex = function(palette)
    {
        var lightest = math.max(fp.map(function(p)
        {
            return p.l;
        }, palette));

        var lightestIndex = fp.findIndex(function(p) { return p.l === lightest; }, palette);

        return lightestIndex;
    };

    //---------------- convert fractal result to a color

    var adjusters = [
    {
        fn: function getColorAdjLightness(functal, palette, escape, adj)
        {
            // returns hsl after adjusting

            var index = Math.floor(escape * palette.size);

            var hsl = palette.colors[math.mod(index, palette.size)];

            hsl.l = hsl.l + adj * 0.1;

            if (hsl.l > 1)
            {
                // wrap so not sudden white to black
                hsl.l = 2 - hsl.l;
            }

            if (hsl.l < 0)
            {
                hsl.l = -hsl.l;
            }

            hsl.l = math.mod(hsl.l, 1);

            return hsl;
        },
        weight: 1
    },
    {
        fn: function getColorAdjItself(functal, palette, escape, adj)
        {
            // returns hsl after adjusting

            var index = Math.floor((adj + 1) / 2 * palette.size);

            var hsl = palette.colors[math.mod(index, palette.size)];

            return hsl;
        },
        weight: 1
    },
    {

        fn: function getColorAdjIndex(functal, palette, escape, adj)
        {
            // returns hsl after adjusting index

            var index = Math.floor(escape + (adj + 1) / 2 * palette.size);

            var hsl = palette.colors[math.mod(index, palette.size)];

            return hsl;
        },
        weight: 1
    },
    {
        fn: function getColorMerge(functal, palette, escape, adj)
        {
            // returns hsl after merging the two colors

            var index1 = Math.floor((adj + 1) / 2 * palette.size);
            var index2 = Math.floor(escape * palette.size);

            var rgb1 = clr.hsl2rgb(palette.colors[math.mod(index1, palette.size)]);
            var rgb2 = clr.hsl2rgb(palette.colors[math.mod(index2, palette.size)]);

            var rgb = {
                r: (rgb1.r + rgb2.r) / 2,
                g: (rgb1.g + rgb2.g) / 2,
                b: (rgb1.b + rgb2.b) / 2
            };

            var hsl = clr.rgb2hsl(rgb);

            return hsl;
        },
        weight: 1
    }];

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
            weight: 40
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
            weight: 40,
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
            weight: 0.5
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
            hue = math.mod(hue + math.random(-0.25, 0.25) / 12, 1);

            palette.mainHue = hue * 12;

            // delta to next hue
            var d = 1 / 12;

            hues.push(
            {
                h: hue,
                weight: 200
            });
            hues.push(
            {
                h: math.mod(hue - 1 * d, 1),
                weight: 25
            }); // adjacent
            hues.push(
            {
                h: math.mod(hue + 1 * d, 1),
                weight: 25
            }); // adjacent
            hues.push(
            {
                h: math.mod(hue + 6 * d, 1),
                weight: 50
            }); // complement

            // calc how many palette entries each color will have, and set a random color for this gap

            // todo: map is supposed to get index
            var index = 0;

            palette.contrast = fp.bandomInt(5, 2);

            var gaps = fp.map(function(n)
            {
                var gap = {
                    gap: math.max(1, math.round(n / sum * size)), // number of palette entries
                    color:
                    {
                        h: fp.wandom(hues).h,
                        // brightish
                        s: fp.bandom(1, -2),
                        // bright/dark bands
                        l: fp.bandom(1, index % 2 ? palette.contrast : -palette.contrast)
                    }
                };

                index++;

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

                    // store hsl for easuer later adjustment
                    palette.colors.push(clr.rgb2hsl(rgb));
                });
            }, gaps);

            // calc lightness std dev
            palette.stdDevL = math.std(fp.map(function(p)
            {
                return p.l;
            }, palette.colors));

            ok = palette.stdDevL > 0.2;

        }
        while (!ok);

        palette.size = palette.colors.length - 1;

        exports.getColor = fp.wandom(adjusters).fn;

        palette.adjuster = fp.nameOf(exports.getColor);

        palette.lighestIndex = findLighestIndex(palette.colors);

        return palette;
    };


}());
