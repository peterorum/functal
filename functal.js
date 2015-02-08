(function()
{
    "use strict";

    var math = require('mathjs');
    var moment = require('moment');

    var fs = require('fs');
    var fsq = require('./fsq');
    var PNG = require('node-png').PNG;

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var Q = require('q');

    var twit = require('./tweet-media');

    //----------- fractal functions
    var ff = {};

    ff.escapeCount = fp.curry(function(f, x, y)
    {
        var count = 0;

        // start z at zero
        var z = math.complex(0, 0);

        // vary c by x & y
        var c = math.complex(x, y);

        var maxCount = f.maxCount;
        var limit = f.limit;

        // count how long the iteration takes to break the limit

        while (count < maxCount - 1)
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
    });

    ff.process = function(f, sample)
    {
        // sample is undefined for full resolution
        // 3 to take points a third of the way in

        var data = [];

        var xincr = 1;
        var yincr = 1;

        if (sample)
        {
            xincr = f.width / sample;
            yincr = f.height / sample;
        }

        var fxincr = (f.range.x2 - f.range.x1) / f.width;
        var fyincr = (f.range.y2 - f.range.y1) / f.height;

        var x = 0;
        var i = 0;

        while (x < f.width)
        {
            var fx = f.range.x1 + fxincr * x;

            data[i] = [];

            var y = 0;
            var j = 0;

            while (y < f.height)
            {
                var fy = f.range.y1 + fyincr * y;

                var count = ff.escapeCount(f, fx, fy);

                data[i][j] = count;

                y += xincr;
                j++;
            }

            x += yincr;
            i++;
        }

        return data;
    };

    // ---------- make a functal

    ff.make = fp.curry(function(options)
    {
        var deferred = Q.defer();

        var startTime = (new Date()).getTime();

        var f = {};

        f.version = options.version();
        f.width = options.width();
        f.height = options.height();
        f.maxCount = options.maxCount();
        f.limit = options.limit();
        f.range = options.range();

        // sample
        var data = ff.process(f, 3);

        // calc std dev for the sample data
        f.stddev = math.std(data);

        // fail if not enough variation in the image sample
        if (f.stddev < 100)
        {
            deferred.reject(f, data);
        }
        else
        {
            // create fractal
            data = ff.process(f);

            // store time taken
            f.time = ((new Date()).getTime() - startTime) / 1000;

            // save
            if (options.file())
            {
                f.file = options.file();

                // save options spec
                fsq.writeFile(f.file + '.json', JSON.stringify(f, null, 4))
                    .then(function()
                    {
                        // save png
                        return ff.png(f, data);

                    }).then(function()
                    {
                        // exit
                        deferred.resolve(f);
                    });
            }
            else
            {
                // no file required - just exit
                deferred.resolve(f);
            }
        }

        return deferred.promise;
    });

    // ------------ output to a png image

    ff.png = fp.curry(function(functal, data)
    {
        var deferred = Q.defer();

        var image = new PNG(
        {
            width: functal.width,
            height: functal.height,
            filterType: -1
        });

        for (var y = 0; y < image.height; y++)
        {
            for (var x = 0; x < image.width; x++)
            {
                var idx = (image.width * y + x) << 2;

                var i = data[x][y];

                // grayscale

                image.data[idx] = i;
                image.data[idx + 1] = i;
                image.data[idx + 2] = i;
                image.data[idx + 3] = 0xff;
            }
        }

        image.pack().pipe(fs.createWriteStream(functal.file + '.png')).on('close', function()
        {
            deferred.resolve();
        });

        return deferred.promise;

    });

    ff.setOptions = function()
    {

        var options = {
            version: function()
            {
                //github branch
                return "1.0.0";
            },

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
            file: function()
            {
                // filename with utc time
                return 'functals/functal-' + moment.utc().format('YYYYMMDDHHmmssSSS');
            },
            range: function()
            {
                var x1 = fp.random(2, true) - 1;
                var x2 = x1 + fp.random(2 - x1, true);
                var y1 = fp.random(2, true) - 1;
                var y2 = y1 + fp.random(2 - y1, true);

                return {
                    x1: x1,
                    x2: x2,
                    y1: y1,
                    y2: y2
                };
            }

        };

        return options;
    };
    // ------------ init a functal

    // recurse until successful

    ff.attempt = function()
    {
        var options = ff.setOptions();

        ff.make(options).then(function(functal)
            {
                console.log(functal.time + ' secs');
                console.log('stddev', functal.stddev);

                // twit.tweet('#fractal', functal.file);
            },
            function(functal, data)
            {
                console.log('rejected', 'stddev', functal.stddev);
                ff.attempt();
            });
    };

    ff.attempt();

}());
