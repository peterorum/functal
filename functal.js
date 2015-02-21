(function()
{
    "use strict";

    var version = '1.1.9';

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
    var limitTests = require('./limitTests');
    var processes = require('./processes');
    var modifiers = require('./modifiers');
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

    fractal.finite = fp.curry(function(max, z)
    {
        if (!fp.isFinite(z.re) || fp.isNaN(z.re))
        {
            z.re = max;
        }

        if (!fp.isFinite(z.im) || fp.isNaN(z.im))
        {
            z.im = max;
        }

        return z;
    });

    fractal.isDone = function(functal, zs)
    {
        return functal.test(zs);
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

        var done = false;

        while (!done && count < maxCount - 1)
        {
            z = functal.process(fractal.zmod(functal, z), c);

            zs.push(z);

            done = fractal.isDone(functal, zs);

            count++;
        }

        // var zsAdj = fp.map(fp.flow(math.sin, math.floor,math.sin), zs);
        var zsAdj = fp.map(fp.flowAll(functal.adjzs), zs);

        var result = {
            count: count,
            zs: zsAdj
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

                var adj = functal.modifiers[0](functal, result);

                data[i][j] = adj;

                y += yincr;
                j++;
            }

            x += xincr;
            i++;
        }

        return data;
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

        functal.limit = options.limit();
        functal.finite = fractal.finite(functal.limit);

        functal.width = options.width();
        functal.height = options.height();
        functal.maxCount = options.maxCount();
        functal.range = options.range();
        functal.rangeWidth = functal.range.x2 - functal.range.x1;


        functal.set = {
            name: options.set.name,
            params: options.set.params()
        };
        functal.minStdDev = options.minStdDev();
        functal.z = options.set.z;
        functal.c = options.set.c;

        var test = fp.wandom(limitTests.tests);
        functal.testName = test.name;
        functal.test = test.fn;

        functal.adjzs = fp.range(0, fp.bandomInt(4, 1)).map(function()
        {
            return fp.wandom(options.z2zfns).fn;
        });

        functal.adjzsNames = fp.map(function(fn)
        {
            var o = {
                name: fp.nameOf(fn)
            };

            // params
            fp.extend(fn, o);

            return o;
        }, functal.adjzs);

        // wrap with finite after getting names
        functal.adjzs = fp.map(function(f)
        {
            return fp.compose(functal.finite, f);
        }, functal.adjzs);

        var process = fp.wandom(processes.processes);
        functal.processName = process.name;
        functal.process = process.fn;
        functal.pow = options.pow();

        var modifierChain = [fp.wandom(modifiers.modifiers)];
        functal.modifiers = fp.map('fn', modifierChain);
        functal.modifierNames = fp.map(function(m)
        {
            var o = {
                name: fp.nameOf(m.fn),
            };

            fp.extend(m.fn, o);

            return o;

        }, modifierChain);

        functal.floorz = options.floorz();

        // sample
        var sampleCount = 10;
        var data = fractal.process(functal, sampleCount);

        // calc std dev for the sample data
        functal.stdDev = math.std(data);
        functal.uniques = fp.unique(fp.flatten(data)).length;


        // fail if not enough variation in the image sample
        if (functal.stdDev < functal.minStdDev || functal.uniques < sampleCount * sampleCount / 2)
        {
            deferred.reject(functal, data);
        }
        else
        {
            try
            {
                // create fractal

                console.log('--- creating');
                console.log(JSON.stringify(functal, null, 4));

                data = fractal.process(functal);
            }
            catch (ex)
            {
                console.error(ex);
                deferred.reject(functal, data);
            }

            // store time taken
            functal.time = ((new Date()).getTime() - startTime);
            functal.duration = moment.duration(functal.time).humanize();

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

        options.z2zfns = [
        {
            fn: math.square,
            weight: 1
        },
        {
            fn: math.sqrt,
            weight: 1
        },
        {
            fn: math.sin,
            weight: 1
        },
        {
            fn: math.cos,
            weight: 1
        },
        {
            fn: math.log,
            weight: 1
        },
        {
            fn: math.floor,
            weight: 0.333
        },
        {
            fn: math.ceil,
            weight: 0.333
        },
        {
            fn: math.round,
            weight: 0.33
        },
        {
            fn: function reciprocal(z)
            {
                return math.divide(math.complex(1, 0), z);
            },

            weight: 1
        },
        {
            fn: (function trigxy()
            {
                var trig1 = fp.wandom([math.sin, math.cos]);
                var trig2 = fp.wandom([math.sin, math.cos]);

                var fxy = {
                    freq1: math.random(20),
                    freq2: math.random(20),
                    trig1: trig1,
                    trig2: trig2,
                    name1: fp.nameOf(trig1),
                    name2: fp.nameOf(trig2)
                };

                var fn = function trigxy(z)
                {
                    return math.complex(fxy.trig1(math.mod(fxy.freq1 * z.re, math.pi * 2)), fxy.trig2(math.mod(fxy.freq2 * z.im, math.pi * 2)));
                };

                fn.params = fxy;

                return fn;
            })(),

            weight: 1
        },
        {
            fn: function fraction(z)
            {
                return math.complex(z.re - math.floor(z.re), z.im - math.floor(z.im));
            },

            weight: 1
        }, ];

        return options;
    };

    // ------------ make a functal

    // use different options until a fractal with enough variety is found

    // recurse until successful as it's async

    fractal.attempt = function()
    {
        var options = fractal.setOptions();

        fractal.make(options).then(function(functal)
            {
                var msg = '#fractal #functal v' + functal.version + ' calc time ' + functal.duration;

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

    var devCount = 1;

    var functals = isDev ? devCount : 1;

    fp.range(0, functals).forEach(function()
    {
        fractal.attempt();
    });

}());
