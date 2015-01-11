(function()
{
    "use strict";

    var R = require('ramda');
    var math = require('mathjs');

    //----------- fractal functions
    var ff = {};

    // convert to -1 .. 1
    ff.normalize = function(range, x){

        return x / range * 2 - 1;
    };

    ff.escapeCount = function(options, x, y)
    {
        var count = 0;

        var z = math.complex(x, y);

        var maxCount = options.maxCount - 1;
        var limit = options.limit;
        var c = options.c;

        while(count < maxCount)
        {
            z = math.chain(z)
            .pow(2)
            .add(c)
            .done();

            if (math.norm(z) > limit)
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
        f.data = [];

        var data = f.data;

        var startTime = (new Date()).getTime();

        R.range(0, options.width).forEach(function(x)
        {
            f.data[x] = [];

            R.range(0, options.height).forEach(function(y)
            {
                var fx = ff.normalize(options.width, x);
                var fy = ff.normalize(options.height, y);

                var count = ff.escapeCount(options, fx, fy);

                data[x][y] = count;
            });
        });

        f.time = ((new Date()).getTime() - startTime) / 1000;

        return f;
    };

    var options = {
        width: 100,
        height: 100,
        maxCount: 256,
        limit: 2,
        c: math.random(-0.5, 0.5)
    };

    var functal = ff.make(options);

    console.log(functal.data);
    console.log(functal.time);
}());
