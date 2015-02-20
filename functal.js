(function()
{
    "use strict";

    var version = '1.1.7';

    var seedrandom = require('seedrandom');
    var randomSeed = (new Date()).getTime();

    // must be first
    seedrandom(randomSeed,
    {
        global: true
    });

    var math = require('mathjs');
    var moment = require('moment');

    var fs = require('fs');
    var fsq = require('./fsq');
    var pal = require('./palette');
    var tests = require('./limitTests');
    var processes = require('./processes');
    var PNG = require('node-png').PNG;
    var Q = require('q');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var twit = require('./tweet-media');

    // smaller image, no tweet
    var isDev = (process.env.TERM_PROGRAM === 'Apple_Terminal');

    //----------- fractal functions

    var fractal = {};

    fractal.zmod = function(functal, z)
    {
        var zmod;

        if (functal.floorz)
        {
            // more blocky
            zmod = math.complex(math.floor(z.re), math.floor(z.im));
        }
        else
        {
            zmod = z;
        }

        return zmod;
    };

    fractal.isDone = function(functal, z)
    {
        return functal.test(z) > functal.limit;
    };

    fractal.escapeCount = function(functal, x, y)
    {
        var count = 0;
        var zs = [];

        var z = functal.z(x, y);
        var c = functal.c(x, y);

        zs.push(z);

        var maxCount = functal.maxCount;

        // count how long the iteration takes to break the limit

        while (count < maxCount - 1)
        {
            z = functal.process(fractal.zmod(functal, z), c);

            zs.push(z);

            var done = fractal.isDone(functal, z);

            if (done)
            {
                break;
            }

            count++;
        }

        var result = {
            count: count,
            zs: zs
        };

        return result;
    };

    fractal.process = function(functal, sample)
    {
        // sample is undefined for full resolution
        // use eg 3 to take points a third of the way in

        // store image results
        var data = [];

        // default to every pixel
        var xincr = 1;
        var yincr = 1;

        // if sample, only do a few
        if (sample)
        {
            xincr = functal.width / sample;
            yincr = functal.height / sample;
        }

        // scaled increment
        var fxincr = (functal.range.x2 - functal.range.x1) / functal.width;
        var fyincr = (functal.range.y2 - functal.range.y1) / functal.height;

        // x,y  pixel position
        var x = 0;

        // i,j index into data result matrix
        var i = 0;

        while (x < functal.width)
        {
            // translate to the sub-range
            var fx = functal.range.x1 + fxincr * x;

            data[i] = [];

            var y = 0;
            var j = 0;

            while (y < functal.height)
            {
                var fy = functal.range.y1 + fyincr * y;

                // all inputs & outputs are 0..1
                var result = fractal.escapeCount(functal, fx, fy);

                var adj = functal.modify(functal, result);

                data[i][j] = adj;

                y += yincr;
                j++;
            }

            x += xincr;
            i++;
        }

        return data;
    };

    // ---------- post-escape modififiers

    fractal.modifiers = {};

    // no change
    fractal.modifiers.identity = fp.identity;

    // treat final calc as an angle
    fractal.modifiers.angle = function(functal, result)
    {
        // return 0..1

        var lastz = fp.last(result.zs);

        var val = (math.atan2(lastz.re, lastz.im) / math.pi + 1.0) / 2.0;

        return val;
    };

    // ---------- make a functal

    fractal.make = function(options)
    {
        // async file writing at end
        var deferred = Q.defer();

        var startTime = (new Date()).getTime();

        var functal = {};

        functal.version = options.version();
        functal.seed = randomSeed;
        functal.width = options.width();
        functal.height = options.height();
        functal.maxCount = options.maxCount();
        functal.limit = options.limit();
        functal.range = options.range();
        functal.rangeWidth = functal.range.x2 - functal.range.x1;

        functal.set = {
            name: options.set.name,
            params: options.set.params()
        };
        functal.minStdDev = options.minStdDev();
        functal.z = options.set.z;
        functal.c = options.set.c;

        var test = fp.wandom(tests.tests);
        functal.testName = test.name;
        functal.test = test.fn;

        var process = fp.wandom(processes.processes);
        functal.processName = process.name;
        functal.process = process.fn;
        functal.pow = options.pow();

        functal.modify = fractal.modifiers.angle;

        functal.floorz = options.floorz();

        // sample
        var sampleCount = 10;
        var data = fractal.process(functal, sampleCount);

        // calc std dev for the sample data
        functal.stdDev = math.std(data);
        functal.uniques = fp.unique(fp.flatten(data)).length;

        // fail if not enough variation in the image sample
        if (functal.stdDev < functal.minStdDev || functal.uniques < sampleCount * sampleCount)
        {
            deferred.reject(functal, data);
        }
        else
        {
            try
            {
                // create fractal
                data = fractal.process(functal);
            }
            catch (ex)
            {
                console.error(ex);
                deferred.reject(functal, data);
            }

            // store time taken
            functal.time = ((new Date()).getTime() - startTime);

            var palette = pal.setPalette();

            fp.extend(fp.omit('colors', palette), functal);

            // save
            if (options.file())
            {
                functal.file = options.file();

                // save options spec
                fsq.writeFile(functal.file + '.json', JSON.stringify(functal, null, 4))
                    .then(function()
                    {
                        // save png
                        return fractal.png(functal, data, palette);

                    }).then(function()
                    {
                        // exit
                        deferred.resolve(functal);
                    });
            }
            else
            {
                // no file required - just exit
                deferred.resolve(functal);
            }
        }

        return deferred.promise;
    };

    // ------------ output to a png image

    fractal.png = function(functal, data, palette)
    {
        var deferred = Q.defer();

        var image = new PNG(
        {
            width: functal.width,
            height: functal.height,
            filterType: -1
        });

        // stretch results over full palette
        var paletteLength = palette.colors.length - 1;

        for (var y = 0; y < image.height; y++)
        {
            for (var x = 0; x < image.width; x++)
            {
                var idx = (image.width * y + x) << 2;

                var index = Math.floor(data[x][y] * paletteLength);

                var rgb = palette.colors[index];

                image.data[idx] = rgb.r;
                image.data[idx + 1] = rgb.g;
                image.data[idx + 2] = rgb.b;
                image.data[idx + 3] = 0xff;
            }
        }

        image.pack().pipe(fs.createWriteStream(functal.file + '.png')).on('close', function()
        {
            deferred.resolve();
        });

        return deferred.promise;

    };

    fractal.setOptions = function()
    {
        var options = {
            version: function()
            {
                // github branch

                return version;
            },

            width: function()
            {
                return (isDev ? 100 : 1024);
            },
            height: function()
            {
                return (isDev ? 100 : 768);
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
            minStdDev: function()
            {
                return 0.15;
            },
            hue: function()
            {
                return math.random(1);
            },
            saturation: function()
            {
                return 1 - math.pow(math.random(1), 2);
            },
            pow: function()
            {
                return math.random(2, 10);
            },
            floorz: function()
            {
                return math.random() < 0.05;
            }
        };

        // keep selected subarea the same aspect ratio as the image

        options.range = function()
        {
            var aspect = options.width() / options.height();

            // range is from -max to max
            var max = 2;

            var width = fp.random(0.001, 2 * max);

            var x1 = fp.random(-max, max - width);

            var x2 = x1 + width;

            var height = width / aspect;

            var y1 = fp.random(-max, max - height);
            var y2 = y1 + height;

            return {
                x1: x1,
                x2: x2,
                y1: y1,
                y2: y2
            };
        };

        // types of fractals with different initial z & c.
        var sets = [
        {
            name: 'mandelbrot',
            z: function()
            {
                return math.complex(0, 0);
            },
            c: function(x, y)
            {
                return math.complex(x, y);
            },
            params: function()
            {
                return {};
            }
        },
        {
            name: 'julia',
            z: function(x, y)
            {
                return math.complex(x, y);
            },
            c: fp.once(function()
            {
                var cmax = 1.75;

                var c = math.complex(fp.random(-cmax, cmax), fp.random(-cmax, cmax));

                return c;
            }),
            params: function()
            {
                // stored for recreating
                return {
                    c: this.c()
                };
            }

        }];

        // pick a random set type
        options.set = sets[fp.random(0, sets.length - 1)];

        return options;
    };

    // ------------ make a functal

    // use difractalerent options until a fractal with enough variety is found

    // recurse until successful as it's async

    debugger;

    fractal.attempt = function()
    {
        var options = fractal.setOptions();

        fractal.make(options).then(function(functal)
            {
                var msg = '#fractal #functal v' + functal.version + ' calc time ' + moment.duration(functal.time).humanize();

                functal.message = msg;

                console.log('--- success');
                console.log(JSON.stringify(functal, null, 4));

                if (!isDev)
                {
                    twit.tweet(msg, functal.file + '.png');
                }
            },
            function(functal)
            {
                console.log('--- rejected');
                console.log(JSON.stringify(functal, null, 4));
                // retry
                fractal.attempt();
            });
    };

    // kick off

    var devCount = 10;

    var functals = isDev ? devCount : 1;

    fp.range(0, functals).forEach(function()
    {
        fractal.attempt();
    });

}());
