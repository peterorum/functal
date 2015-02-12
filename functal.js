(function()
{
    "use strict";

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
    var clr = require('./color');
    var PNG = require('node-png').PNG;

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var Q = require('q');

    var twit = require('./tweet-media');

    // smaller image, no tweet
    var isDev = (process.env.TERM_PROGRAM === 'Apple_Terminal');

    //----------- fractal functions

    var ff = {};

    ff.tests = {
        norm: function(z, limit)
        {
            return math.norm(z) > limit;
        },
        sum: function(z, limit)
        {
            return math.abs(z.re) + math.abs(z.im) > limit;
        },
        diff: function(z, limit)
        {
            return math.abs(z.re) - math.abs(z.im) > limit;
        },
        maxabs: function(z, limit)
        {
            return math.max(math.abs(z.re), math.abs(z.im)) > limit;
        },
        minabs: function(z, limit)
        {
            return math.min(math.abs(z.re), math.abs(z.im)) > limit;
        },
        max: function(z, limit)
        {
            return math.max(z.re, z.im) > limit;
        }
    };

    ff.escapeCount = function(f, x, y)
    {
        var count = 0;
        var zs = [];

        var z = f.z(x, y);
        var c = f.c(x, y);

        zs.push(z);

        var maxCount = f.maxCount;
        var limit = f.limit;

        // count how long the iteration takes to break the limit

        while (count < maxCount - 1)
        {
            z = math.chain(z)
                .pow(2)
                .add(c)
                .done();

            zs.push(z);

            var done = f.test(z, limit);

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

    ff.process = function(f, sample)
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
            xincr = f.width / sample;
            yincr = f.height / sample;
        }

        // scaled increment
        var fxincr = (f.range.x2 - f.range.x1) / f.width;
        var fyincr = (f.range.y2 - f.range.y1) / f.height;

        // x,y  pixel position
        var x = 0;

        // i,j index into data result matrix
        var i = 0;

        while (x < f.width)
        {
            // translate to the sub-range
            var fx = f.range.x1 + fxincr * x;

            data[i] = [];

            var y = 0;
            var j = 0;

            while (y < f.height)
            {
                var fy = f.range.y1 + fyincr * y;

                // all inputs & outputs are 0..1
                var result = ff.escapeCount(f, fx, fy);

                var adj = f.modify(f, result);

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

    ff.modifiers = {};

    // no change
    ff.modifiers.identity = fp.identity;

    // treat final calc as an angle
    ff.modifiers.angle = function(functal, result)
    {
        // return 0..1

        var lastz = fp.last(result.zs);

        var val = (math.atan2(lastz.re, lastz.im) / math.pi + 1.0) / 2.0;

        return val;
    };

    // ---------- make a functal

    ff.make = function(options)
    {
        // async file writing at end
        var deferred = Q.defer();

        var startTime = (new Date()).getTime();

        var f = {};

        f.version = options.version();
        f.seed = randomSeed;
        f.width = options.width();
        f.height = options.height();
        f.maxCount = options.maxCount();
        f.limit = options.limit();
        f.range = options.range();
        f.rangeWidth = f.range.x2 - f.range.x1;

        f.set = {
            name: options.set.name,
            params: options.set.params()
        };
        f.minStdDev = options.minStdDev();
        f.z = options.set.z;
        f.c = options.set.c;

        f.hue = options.hue();
        f.saturation = options.saturation();

        f.testName = fp.pickRandomKey(ff.tests);
        f.test = ff.tests[f.testName];

        f.modify = ff.modifiers.angle;

        // sample
        var data = ff.process(f, 3);

        // calc std dev for the sample data
        f.stdDev = math.std(data);

        // fail if not enough variation in the image sample
        if (f.stdDev < f.minStdDev)
        {
            deferred.reject(f, data);
        }
        else
        {
            // create fractal
            data = ff.process(f);

            // store time taken
            f.time = ((new Date()).getTime() - startTime);

            var palette = ff.setPalette();

            fp.extend(fp.omit('colors', palette), f);

            // save
            if (options.file())
            {
                f.file = options.file();

                // save options spec
                fsq.writeFile(f.file + '.json', JSON.stringify(f, null, 4))
                    .then(function()
                    {
                        // save png
                        return ff.png(f, data, palette);

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
    };

    // ------------ output to a png image

    ff.png = function(functal, data, palette)
    {
        var deferred = Q.defer();

        var image = new PNG(
        {
            width: functal.width,
            height: functal.height,
            filterType: -1
        });

        // stretch results over full palette
        var paletteLength = palette.colors.length;

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

    ff.setOptions = function()
    {

        var options = {
            version: function()
            {
                // github branch

                return "1.1.5";
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
                return 0.1;
            },
            hue: function()
            {
                return math.random(1);
            },
            saturation: function()
            {
                return 1 - math.pow(math.random(1), 2);
            }
        };

        // keep selected subarea the same aspect ratio as the image

        options.range = function()
        {
            var aspect = options.width() / options.height();

            // range is form -max to max
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

    // ------------ make color palette

    ff.setPalette = function()
    {
        var palette = {};

        var size = 4096;

        // keep trying until acceptable palette

        var ok = false;

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

            var hue = math.random(1);

            palette.mainHue = hue;

            // delta to next hue
            var d = 1 / 12;

            hues.push(hue);
            hues.push(math.mod(hue + 6 * d, 1));
            hues.push(math.mod(hue + 1 * d, 1));
            hues.push(math.mod(hue + 2 * d, 1));
            hues.push(math.mod(hue - 1 * d, 1));
            hues.push(math.mod(hue - 2 * d, 1));

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

    // ------------ make a functal

    // use different options until a fractal with enough variety is found

    // recurse until successful as it's async

    ff.attempt = function()
    {
        var options = ff.setOptions();

        ff.make(options).then(function(functal)
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
                ff.attempt();
            });
    };

    // kick off

    var devCount = 4;

    var functals = isDev ? devCount : 1;

    fp.range(0, functals).forEach(function()
    {
        ff.attempt();
    });

}());
