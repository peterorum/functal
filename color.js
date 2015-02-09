(function()
{
    "use strict";

    var h2rgb = function(f1, f2, h)
    {
        var rgb = f1;

        if (h < 0)
            h += 1.0;

        if (h > 1)
            h -= 1.0;

        if (6.0 * h < 1)
        {
            rgb = (f1 + (f2 - f1) * h * 6.0);
        }
        else if (2.0 * h < 1)
        {
            rgb = f2;
        }
        else if (3.0 * h < 2.0)
        {
            rgb = (f1 + (f2 - f1) * ((2.0 / 3.0) - h) * 6.0);
        }

        return rgb;
    };

    exports.hsl2rgb = function(hsl)
    {
        // hsl are all 0..1

        var h = hsl.h;
        var s = hsl.s;
        var l = hsl.l;

        if (h < 0)
            h += 1.0;

        if (h > 1.0)
            h -= 1.0;

        h = Math.min(1.0, Math.max(0.0, h));
        s = Math.min(1.0, Math.max(0.0, s));
        l = Math.min(1.0, Math.max(0.0, l));

        var r, g, b;

        if (s === 0)
        {
            r = g = b = l; // gray
        }
        else
        {
            var f2;

            if (l <= 0.5)
                f2 = l * (1.0 + s);
            else
                f2 = l + s - l * s;

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

    exports.rgb2hsl = function(rgb)
    {
        // rgb are all 0..255

        var r = rgb.r / 255.0;
        var g = rgb.g / 255.0;
        var b = rgb.b / 255.0;

        var fMax = max(r, max(g, b));
        var fMin = min(r, min(g, b));

        var h = 0;
        var s = 0;
        var l = (fMax + fMin) / 2.0;

        if (fMax == fMin)
        {
            s = 0.0;
            h = 0.0;
        }
        else
        {
            if (l < 0.5)
            {
                s = (fMax - fMin) / (fMax + fMin);
            }
            else
            {
                s = (fMax - fMin) / (2.0 - fMax - fMin);
            }

            var fDelta = fMax - fMin;

            if (r == fMax)
            {
                h = (g - b) / fDelta;
            }
            else if (g == fMax)
            {
                h = 2.0 + (b - r) / fDelta;
            }
            else
            {
                h = 4.0 + (r - g) / fDelta;
            }

            h /= 6.0;

            if (h < 0.0)
                h += 1.0;
        }

        var hsl = {
            h: h,
            s: s,
            l: l
        };

        return hsl;
    };
})();