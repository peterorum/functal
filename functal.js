(function()
{
    "use strict";

    var R = require('ramda');
    var math = require('mathjs');

    //----------- fractal functions
    var ff = {};

    // convert to -1 .. 1
    ff.normalize = function(range, x)
    {

        return x / range * 2 - 1;
    };

    ff.escapeCount = function(options, x, y)
    {
        var count = 0;
        var o = options;

        var z = math.complex(x, y);

        while (count < o.maxCount() - 1)
        {
            z = math.chain(z)
                .pow(2)
                .add(o.c())
                .done();

            if (math.norm(z) > o.limit())
            {
                break;
            }

            count++;
        }

        return count;
    };

    // ---------- make a functal

    ff.make = function(options)
    {
        var f = {};
        f.options = options;
        var o = options;
        f.data = [];

        var data = f.data;

        var startTime = (new Date()).getTime();

        R.range(0, o.width()).forEach(function(x)
        {
            f.data[x] = [];

            R.range(0, o.height()).forEach(function(y)
            {
                var fx = ff.normalize(o.width(), x);
                var fy = ff.normalize(o.height(), y);

                var count = ff.escapeCount(options, fx, fy);

                data[x][y] = count;
            });
        });

        f.time = ((new Date()).getTime() - startTime) / 1000;

        return f;
    };

    var options = {
        width: function()
        {
            return 100;
        },
        height: function()
        {
            return 100;
        },
        maxCount: function()
        {
            return 256;
        },
        limit: function()
        {
            return 2;
        },
        c: function()
        {
            return math.random(-0.5, 0.5);
        }
    };

    var functal = ff.make(options);

    // console.log(functal.data);
    console.log(functal.time);
}());
