(function()
{
    "use strict";

    var version = '1.3.3';

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
    var clr = require('./color');
    var PNG = require('node-png').PNG;
    var Q = require('q');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    // smaller image, no tweet
    var isDev = (process.env.TERM_PROGRAM === 'Apple_Terminal');

    var functalsFolder = isDev ? 'functals' : process.env.HOME + '/Dropbox/functals';

    //----------- fractal functions

    var fractal = {};

    fractal.finite = fp.curry(function(max, z)
    {
        if (fp.isNumber(z))
        {
            if (!fp.isFinite(z) || fp.isNaN(z))
            {
                z = max;
            }
        }
        else
        {
            if (!fp.isFinite(z.re) || fp.isNaN(z.re))
            {
                z.re = max;
            }

            if (!fp.isFinite(z.im) || fp.isNaN(z.im))
            {
                z.im = max;
            }
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
            z = functal.process(z, c);

            zs.push(z);

            done = fractal.isDone(functal, zs);

            count++;
        }

        var zsAdj = functal.adjzs.length ? fp.map(fp.flow.apply(null, functal.adjzs), zs) : zs;

        var result = {
            escape: count / maxCount,
            zs: zsAdj
        };

        return result;
    };

    fractal.getModifierValues = function(functal, result)
    {
        fp.forEach(function(m, i)
        {
            functal.modifierValues[i] = m.fn(functal, result);

        }, functal.modifiers);

        return functal.modifierValues;
    };

    fractal.setLayerOffsets = function(functal, palette)
    {
        // determine palette offstes for each layer such that th elighest point is always at the golden mean position.
        // at this point, want index + offset = lightest

        var goldenMeanx = functal.range.x1 + (1 - 0.618033989) * (functal.range.x2 - functal.range.x1);

        var aspect = functal.width / functal.height;
        var goldenMeany = goldenMeanx / aspect;

        var result = fractal.escapeCount(functal, goldenMeanx, goldenMeany);

        functal.baseOffset = palette.lightestIndex - pal.getColorIndex(palette.size, result.escape);

        var mods = fractal.getModifierValues(functal, result);

        functal.layerOffsets = fp.map(function(m)
        {
            return palette.lightestIndex - pal.getColorIndex(palette.size, m);

        }, mods);
    };

    fractal.process = function(functal, palette, sample)
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

        functal.startTime = (new Date()).getTime();

        // x,y  pixel position
        var x = 0;
        var eta = '';

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

                var rgb, hsl;

                if (!fp.isEmpty(functal.modifiers))
                {
                    var mods = fractal.getModifierValues(functal, result);
                    var k;

                    if (functal.blend)
                    {
                        // blend modifiers onto base color
                        // use [r, g, b]

                        var baseColor = fp.values(clr.hsl2rgb(pal.getColor(palette, result.escape, functal.baseOffset)));
                        var base = math.multiply(baseColor, functal.baseLayer);

                        // not being passed as an argument for unknown reason. check with ramda
                        k = 0;

                        var blended = fp.reduce(function(sum, mod)
                        {
                            var hsl = pal.getColor(palette, mod, functal.layerOffsets[k]);

                            var modColor = fp.values(clr.hsl2rgb(hsl));

                            modColor = math.multiply(modColor, functal.layers[k]);

                            k++;

                            return math.add(sum, modColor);

                        }, base, mods);

                        blended = math.floor(blended);

                        rgb = fp.zipObject(blended, ['r', 'g', 'b']);
                    }
                    else
                    {
                        // sum the values & use as index

                        k = 0;

                        var total = fp.reduce(function(sum, mod)
                        {
                            return sum + mod * functal.layers[k++];

                        }, result.escape * functal.baseLayer, mods);

                        hsl = pal.getColor(palette, total, 0);
                        rgb = clr.hsl2rgb(hsl);
                    }
                }
                else
                {
                    hsl = pal.getColor(palette, result.escape, 0);
                    rgb = clr.hsl2rgb(hsl);
                }

                data[i][j] = {
                    rgb: rgb,
                    escape: result.escape
                };

                y += yincr;
                j++;
            }

            x += xincr;
            i++;

            if (!sample)
            {
                var duration = moment.duration(((new Date()).getTime() - functal.startTime) / i * (functal.width - i));

                var neweta = duration.humanize();

                if (neweta !== eta)
                {
                    eta = neweta;
                    console.log(eta);
                }

                if (duration.asHours() >= 8)
                {
                    throw "expected time overflow";
                }
            }
        }

        return data;
    };

    fractal.init = function(options)
    {
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
        functal.minLightnessStdDev = options.minLightnessStdDev();
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

        var modifierChain = fp.range(0, 1 + fp.bandomInt(8, 2)).map(function()
        {
            return fp.wandom(modifiers.modifiers);
        });

        fp.forEach(function(f)
        {
            if (f.fn.setParams)
            {
                f.fn.setParams();
            }
        }, modifierChain);

        functal.modifiers = fp.map(function(m)
        {
            var modifier = {
                fn: m.fn,
                name: fp.nameOf(m.fn)
            };

            fp.extend(m.fn, modifier);

            return modifier;

        }, modifierChain);

        // presize results array
        functal.modifierValues = new Array(functal.modifiers.length);

        functal.blend = math.random(1) < 0.5;

        // weight factors
        functal.layers = [];

        // must sum to 1
        var layerRemaining = 1;

        fp.times(function()
        {
            var factor = math.random(layerRemaining);
            layerRemaining -= factor;

            functal.layers.push(factor);

        }, functal.modifiers.length);

        var layerSum = math.sum(functal.layers);

        // dregs to original escape
        functal.baseLayer = 1.0 - layerSum;

        functal.modifierReduce = fp.wandom(modifiers.reducers).fn;
        functal.modifierReduceName = fp.nameOf(functal.modifierReduce);

        return functal;
    };

    // ---------- make a functal

    fractal.make = function(options, palette)
    {
        // async file writing at end
        var deferred = Q.defer();

        var functal = fractal.init(options);

        fractal.setLayerOffsets(functal, palette);

        // sample
        var sampleCount = 10;
        var data = fractal.process(functal, palette, sampleCount);

        var flatData = fp.flatten(data);

        // // calc std dev for the sample data
        var escapes = fp.map(function(d)
        {
            return d.escape;
        }, flatData);

        functal.stdDev = math.std(escapes);

        // analyze lightness
        var ls = fp.map(function(d)
        {
            return clr.rgb2hsl(d.rgb).l;
        }, flatData);

        var lightnessStddev = math.std(ls);

        functal.lightnessStddev = lightnessStddev;
        functal.uniques = fp.unique(ls).length;

        // fail if not enough variation in the image sample
        if (functal.stdDev < functal.minStdDev || functal.lightnessStddev < functal.minLightnessStdDev || functal.uniques <= sampleCount)
        {
            deferred.reject(functal);
        }
        else
        {
            try
            {
                // create fractal

                fp.extend(fp.omit('colors', palette), functal);

                console.log('--- creating');
                console.log(JSON.stringify(functal, null, 4));

                data = fractal.process(functal, palette);

                // store time taken
                functal.time = ((new Date()).getTime() - functal.startTime);
                functal.duration = moment.duration(functal.time).humanize();

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

                        }).done(function()
                        {
                            // exit
                            deferred.resolve(functal);
                        }, function(ex)
                        {
                            functal.error = ex;
                            deferred.reject(functal);
                        });
                }
                else
                {
                    // no file required - just exit
                    deferred.resolve(functal);
                }
            }
            catch (ex)
            {
                functal.error = ex;
                deferred.reject(functal);
            }
        }

        return deferred.promise;
    };

    // ------------ output to a png image

    fractal.png = function(functal, data)
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
                var rgb = data[x][y].rgb;

                var idx = (image.width * y + x) << 2;

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

    fractal.setOptions = function(size)
    {
        // size: small, medium, large
        var sizes = {
            small:
            {
                width: 100,
                height: 100
            },
            medium:
            {
                width: 768,
                height: 1024
            },
            large:
            {
                width: 1920,
                height: 1080
            }
        };

        var options = {
            version: function()
            {
                // github branch

                return version;
            },

            width: function()
            {
                return sizes[size].width;
            },
            height: function()
            {
                return sizes[size].height;
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
                return functalsFolder + '/' + size + '/functal-' + moment.utc().format('YYYYMMDDHHmmssSSS');
            },
            minStdDev: function()
            {
                return 0.01;
            },
            minLightnessStdDev: function()
            {
                return 0.25;
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
        var size = (isDev ? 'small' : 'medium');

        var options = fractal.setOptions(size);

        var palette = pal.setPalette();

        fractal.make(options, palette).done(function( /*functal*/ ) {},
            function(functal)
            {
                if (isDev)
                {
                    console.log(JSON.stringify(functal, null, 4));
                }

                if (functal.error)
                {
                    console.error('--- error');
                }
                else
                {
                    if (isDev)
                    {
                        console.log('--- rejected');
                    }

                    // retry

                    fractal.attempt();
                }
            });
    };

    // kick off

    var devCount = 1;

    var functals = isDev ? devCount : 1;

    var proceed = true;

    if (!isDev)
    {
        // only proceed if less than 100 fractals already stored

        var files = fsq.readdirSync(functalsFolder + '/medium');

        var pngs = fp.filter(function(f)
        {
            return fp.endsWith('.png', f);
        }, files);

        proceed = pngs.length < 100;
    }

    if (proceed)
    {
        fp.times(function()
        {
            fractal.attempt();
        }, functals);
    }

}());
