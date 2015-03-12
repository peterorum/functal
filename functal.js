(function()
{
    "use strict";

    var version = '1.4.5';

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

    var R = require('ramda');
    var Rp = require('./plus-fp/plus-fp');

    // var heapdump = require('heapdump')
    // heapdump.writeSnapshot();

    // smaller image, no tweet
    var isDev = (process.env.TERM_PROGRAM === 'Apple_Terminal');

    var functalsFolder = isDev ? 'functals' : process.env.HOME + '/Dropbox/functals';

    //----------- fractal functions

    var fractal = {};

    fractal.finite = R.curry(function(max, z)
    {
        if (R.is(Number, z))
        {
            if (!isFinite(z) || isNaN(z))
            {
                z = max;
            }
        }
        else
        {
            if (!isFinite(z.re) || isNaN(z.re))
            {
                z.re = max;
            }

            if (!isFinite(z.im) || isNaN(z.im))
            {
                z.im = max;
            }
        }

        return z;
    });

    fractal.isOkToMake = function()
    {
        var ok = true;

        // only proceed if less than 100 fractals already stored

        var files = fs.readdirSync(functalsFolder + '/medium');

        var pngs = R.filter(function(f)
        {
            return /\.png$/.test(f);
        }, files);

        ok = pngs.length < 100;

        return ok;
    };

    fractal.isDone = function(functal, z)
    {
        return functal.test(z);
    };

    fractal.escapeCount = function(functal, x, y)
    {
        var count = 0;

        var zs = [];

        var z = functal.z(x, y);
        var c = functal.c(x, y);

        zs[0] = z;

        var maxCount = functal.maxCount;

        // count how long the iteration takes to break the limit

        var done = false;

        while (!done && count < maxCount - 1)
        {
            z = functal.finite(functal.process(z, c));

            zs.push(z);

            done = fractal.isDone(functal, zs);

            count++;
        }

        var zsAdj = functal.adjzs.length ? R.map(R.compose.apply(functal, functal.adjzs), zs) : zs;

        var result = {
            escape: count / maxCount,
            zs: zsAdj,
            unescaped: (count >= maxCount - 1)
        };

        return result;
    };

    fractal.getModifierValues = function(functal, result)
    {
        var mods = R.mapIndexed(function(m, i)
        {
            var x = m.fn(functal, result);
            x = functal.finite(functal.reducers[i](x));
            x = functal.modifierModifiers[i](x);

            return x;
        }, functal.modifiers);

        return mods;
    };

    fractal.setLayerOffsets = function(functal, palette)
    {
        // determine palette offsets for each layer such that th elighest point is always at the golden mean position.
        // at this point, want index + offset = lightest

        var goldenMeanx = functal.range.x1 + (1 - 0.618033989) * (functal.range.x2 - functal.range.x1);

        var aspect = functal.width / functal.height;
        var goldenMeany = goldenMeanx / aspect;

        var result = fractal.escapeCount(functal, goldenMeanx, goldenMeany);

        var mods = fractal.getModifierValues(functal, result);

        if (functal.blend)
        {
            functal.baseOffset = palette.lightestIndex - pal.getColorIndex(palette.size, result.escape);

            functal.layerOffsets = R.map(function(m)
            {
                return palette.lightestIndex - pal.getColorIndex(palette.size, m);

            }, mods);
        }
        else
        {
            var k = 0;

            var total = R.reduce(function(sum, mod)
            {
                return sum + mod * functal.layers[k++];

            }, result.escape * functal.baseLayer, mods);

            functal.baseOffset = palette.lightestIndex - pal.getColorIndex(palette.size, total);
        }
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

        functal.accept = true;

        while (x < functal.width && functal.accept)
        {
            // translate to the sub-range
            var fx = functal.range.x1 + fxincr * x;

            data[i] = [];

            var y = 0;
            var j = 0;

            while (y < functal.height && functal.accept)
            {
                var fy = functal.range.y1 + fyincr * y;

                // all inputs & outputs are 0..1
                var result = fractal.escapeCount(functal, fx, fy);

                if (sample && result.unescaped)
                {
                    functal.accept = false;
                    break;
                }

                var rgb, hsl;

                if (!R.isEmpty(functal.modifiers))
                {
                    var mods = fractal.getModifierValues(functal, result);

                    // if(i + j === 0)
                    // {
                    //     console.log(functal);
                    // }
                    // console.log(result);
                    // console.log(mods);

                    var k;

                    if (functal.blend)
                    {
                        // blend modifiers onto base color
                        // use [r, g, b]

                        var base = R.values(clr.hsl2rgb(pal.getColor(palette, result.escape, functal.baseOffset)));
                        base = math.multiply(base, functal.baseLayer);

                        // not being passed as an argument for unknown reason. check with ramda
                        k = 0;

                        var blended = R.reduce(function(sum, mod)
                        {
                            var hsl = pal.getColor(palette, mod, functal.layerOffsets[k]);

                            var modColor = R.values(clr.hsl2rgb(hsl));

                            modColor = math.multiply(modColor, functal.layers[k]);

                            k++;

                            return math.add(sum, modColor);

                        }, base, mods);

                        blended = math.floor(blended);

                        rgb = R.zipObj(['r', 'g', 'b'], blended);
                    }
                    else
                    {
                        // sum the values & use as index

                        k = 0;

                        var total = R.reduce(function(sum, mod)
                        {
                            return sum + mod * functal.layers[k++];

                        }, result.escape * functal.baseLayer, mods);

                        hsl = pal.getColor(palette, total, functal.baseOffset);
                        rgb = clr.hsl2rgb(hsl);
                    }
                }
                else
                {
                    hsl = pal.getColor(palette, result.escape, functal.baseOffset);
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
                    functal.accept = false;

                    throw "time overflow";
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

        functal.sampleCount = 10;

        functal.set = {
            name: options.set.name,
            params: options.set.params()
        };
        functal.minStdDev = options.minStdDev();
        functal.minLightnessStdDev = options.minLightnessStdDev();
        functal.z = options.set.z;
        functal.c = options.set.c;

        functal.file = options.file();

        var test = Rp.wandom(limitTests.tests);
        functal.testName = test.name;
        functal.test = test.fn;

        functal.adjzs = R.times(function()
        {
            return Rp.wandom(options.z2zfns).fn;
        }, Rp.bandomInt(4, 2));

        functal.adjzsNames = R.map(function(fn)
        {
            var o = {
                name: Rp.nameOf(fn)
            };

            // params
            o = R.merge(fn, o);

            return o;
        }, functal.adjzs);

        // wrap with finite after getting names
        functal.adjzs = R.map(function(f)
        {
            return R.compose(functal.finite, f);
        }, functal.adjzs);

        var process = Rp.wandom(processes.processes);
        functal.processName = process.name;
        functal.process = process.fn;
        functal.pow = options.pow();

        var modifierChain = R.times(function()
        {
            return Rp.wandom(modifiers.modifiers);
        }, 1 + Rp.bandomInt(8, 2));

        functal.modifierModifiers = [];
        functal.modifierModifierNames = [];

        var modifierModifierFns = [
        {
            fn: R.identity,
            weight: 1
        },
        {
            fn: math.square,
            weight: 1
        },
        {
            fn: math.abs,
            weight: 1
        },
        {
            fn: math.round,
            weight: 1
        },
        {
            fn: R.curry(function cospi(x)
            {
                return math.cos(math.pi * x);
            }),
            weight: 1
        }, ];

        R.times(function()
        {
            var mmfn = Rp.wandom(modifierModifierFns).fn;

            functal.modifierModifiers.push(mmfn);
            functal.modifierModifierNames.push(Rp.nameOf(mmfn));

        }, modifierChain.length);

        functal.reducers = [];
        functal.reducerNames = [];

        functal.modifiers = R.map(function(m)
        {
            var modifier = R.merge(m.fn,
            {
                fn: m.fn,
                name: m.name
            });

            var reducer = Rp.wandom(modifiers.reducers).fn;
            functal.reducers.push(reducer);
            functal.reducerNames.push(reducer.name);

            return modifier;

        }, modifierChain);

        functal.blend = math.random(1) < 0.8;

        // weight factors
        functal.layers = [];

        // must sum to 1
        var layerRemaining = 1;

        R.times(function()
        {
            var factor = math.random(layerRemaining);
            layerRemaining -= factor;

            functal.layers.push(factor);

        }, functal.modifiers.length);

        // functal.layers[0] = 0.25;
        // functal.layers[1] = 0.5;

        var layerSum = math.sum(functal.layers);

        // dregs to original escape
        functal.baseLayer = 1.0 - layerSum;

        return functal;
    };

    // ---------- sample a functal

    fractal.calcVariation = function(options, palette)
    {
        var functal = fractal.init(options);

        fractal.setLayerOffsets(functal, palette);

        // get sampled data
        var data = fractal.process(functal, palette, functal.sampleCount);

        if (functal.accept)
        {
            // make easier to analyze
            var flatData = R.flatten(data);

            // // calc std dev for the sample data
            var escapes = R.map(function(d)
            {
                return d.escape;
            }, flatData);

            // store in object to facilitate dumping
            functal.stdDev = math.std(escapes);

            // analyze lightness
            var ls = R.map(function(d)
            {
                return clr.rgb2hsl(d.rgb).l;
            }, flatData);

            var lightnessStddev = math.std(ls);

            functal.lightnessStddev = lightnessStddev;
            functal.uniques = R.uniq(ls).length;
        }

        return functal;
    };

    // ---------- make a functal

    fractal.make = function(functal, palette)
    {
        try
        {
            // create fractal

            functal.palette = R.omit(['colors'], palette);

            console.log('--- creating');
            fractal.dump(functal);

            functal.data = fractal.process(functal, palette);
        }
        catch (ex)
        {
            functal.error = ex;
        }

        // store time taken
        functal.time = ((new Date()).getTime() - functal.startTime);
        functal.duration = moment.duration(functal.time).humanize();
    };

    // ------------ dump for debugging
    fractal.dump = function(functal)
    {
        console.log(JSON.stringify(R.omit(['zs', 'data'], functal), null, 4));
    };

    // ------------ output to a png image

    fractal.png = function(functal)
    {
        var deferred = Q.defer();

        var image = new PNG(
        {
            width: functal.width,
            height: functal.height,
            filterType: -1
        });

        var data = functal.data;

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
                return 0.02;
            },
            minLightnessStdDev: function()
            {
                return 0.25;
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

            var width = math.random(0.001, 2 * max);

            var x1 = math.random(-max, max - width);

            var x2 = x1 + width;

            var height = width / aspect;

            var y1 = math.random(-max, max - height);
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
            c: R.once(function()
            {
                var cmax = 1.75;

                var c = math.complex(math.random(-cmax, cmax), math.random(-cmax, cmax));

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
        options.set = sets[math.randomInt(0, sets.length)];

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
                var trig1 = Rp.wandom([math.sin, math.cos]);
                var trig2 = Rp.wandom([math.sin, math.cos]);

                var fxy = {
                    freq1: math.random(20),
                    freq2: math.random(20),
                    trig1: trig1,
                    trig2: trig2,
                    name1: Rp.nameOf(trig1),
                    name2: Rp.nameOf(trig2)
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


    fractal.create = function()
    {
        var deferred = Q.defer();

        var options, palette, functal;

        var size = (isDev ? 'small' : 'medium');

        // use different options until a fractal with enough variety is found

        var ok = false;

        do {
            options = fractal.setOptions(size);

            palette = pal.setPalette();

            functal = fractal.calcVariation(options, palette);

            // fail if not enough variation in the image sample
            ok = (functal.accept && functal.stdDev > functal.minStdDev && functal.lightnessStddev > functal.minLightnessStdDev && functal.uniques > functal.sampleCount);

            if (isDev && !ok)
            {
                fractal.dump(functal);
                console.log('--- rejected');
            }

        } while (!ok);

        // make full fractal

        fractal.make(functal, palette);

        console.log('=== total duration: ', functal.duration);

        if (functal.accept)
        {
            // save options spec
            fsq.writeFile(functal.file + '.json', JSON.stringify(R.omit(['zs', 'data'], functal), null, 4))
                .then(function()
                {
                    // save png
                    return fractal.png(functal);

                }).done(function()
                {
                    deferred.resolve();
                });
        }
        else
        {
            deferred.reject();
        }

        return deferred.promise;

    };

    // kick off

    if (!isDev && !fractal.isOkToMake())
    {
        // sleep for a little while if enough files already & then exit for shell script to restart
        console.log('sleeping');

        setTimeout(function()
        {
            console.log('slept');
        }, 60 * 1000);
    }
    else
    {
        // make an array with the create function repeated

        var creators = R.times(function()
        {
            return fractal.create;
        }, isDev ? 12 : 1);

        // run sequentially

        // initial promise
        var result = Q(); // jshint ignore:line

        R.forEach(function(f)
        {
            result = result.then(f);
        }, creators);
    }
}());
