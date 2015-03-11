(function()
{
    "use strict";

    var math = require('mathjs');

    var R = require('ramda');
    var Rp = require('./plus-fp/plus-fp');

    // modifying the final result
    // return -1..1

    exports.reducers = [
    {
        fn: R.last,
        weight: 1
    },
    {
        fn: math.min,
        weight: 1
    },
    {
        fn: math.max,
        weight: 1
    },
    {
        fn: math.mean,
        weight: 1
    }];

    exports.modifiers = [
        {
            fn: function angle(functal, result)
            {
                var vals = R.map(function(z)
                {
                    return math.atan2(z.re, z.im) / math.pi;
                }, result.zs);

                return functal.modifierReduce(vals);
            },
            weight: 1,
        },
        {
            fn: function angleChange(functal, result)
            {
                var vals = R.mapIndexed(function(z, i, zs)
                {
                    var x = 0;

                    if (i > 0)
                    {
                        var z1 = zs[i - 1];
                        var z2 = math.subtract(zs[i], z1);

                        x = math.atan2(z2.re, z2.im) / math.pi;
                    }

                    return x;

                }, result.zs);

                return functal.modifierReduce(vals);
            },
            weight: 1,
        },
        {
            fn: function real(functal, result)
            {
                var max = math.max(R.map(function(z)
                {
                    return math.abs(z.re);
                }, result.zs));

                var vals = R.map(function(z)
                {
                    return max ? z.re / max : 1;
                }, result.zs);

                return functal.modifierReduce(vals);
            },
            weight: 1,
        },

        {
            fn: function norm(functal, result)
            {
                var vals = R.map(function(z)
                {
                    var x = functal.finite(math.norm(z)) / functal.limit;

                    return x;
                }, result.zs);

                return functal.modifierReduce(vals);
            },
            weight: 1,
        },
        {
            // circle trap

            fn: (function()
            {
                var fn = R.curry(function circleTrap(diameter, band, centre, functal, result)
                {
                    var x;

                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        var distance = math.sqrt(functal.finite(math.norm(z1)));

                        if (math.abs(distance - diameter) < band)
                        {
                            x = math.max(-1, math.min(1, distance - diameter));
                        }
                        else
                        {
                            x = 0;
                        }

                        return x;
                    }, result.zs);

                    return functal.modifierReduce(vals);
                });

                var diameter = Rp.bandom(1, -2);
                var band = Rp.bandom(1, -3);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());

                // return curried function with constants,
                return fn(diameter, band, centre);
            })(),
            weight: 1000000,
        },
        {
            // real circle trap

            fn: (function()
            {
                var fn = R.curry(function realCircleTrap(centre, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var x = math.mod(z.re - centre, 1);

                        return math.sqrt(math.max(0, 1.0 - x * x));

                    }, result.zs);

                    return functal.modifierReduce(vals);
                });

                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());

                return fn(centre);

            })(),
            weight: 1,
        },
        {
            // box trap

            fn: (function()
            {
                var fn = R.curry(function boxTrap(diameter, centre, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        var x = math.abs(z1.re);
                        var y = math.abs(z1.im);

                        var dist = math.max(x, y);

                        return math.mod(dist - diameter, 1);

                    }, result.zs);

                    return functal.modifierReduce(vals) / math.max(R.map(math.abs, vals));
                });

                var diameter = Rp.bandom(1, -2);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());

                return fn(diameter, centre);
            })(),
            weight: 1,
        },
        {
            // sin trap

            fn: (function()
            {
                var fn = R.curry(function sinTrap(diameter, centre, ampl, freq, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        return z1.im + ampl * math.sin(freq * z1.re) - diameter;


                    }, result.zs);

                    return functal.finite(functal.modifierReduce(vals)) / math.max(R.map(math.abs, vals));
                });

                var diameter = Rp.bandom(1, -2);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());
                var freq = Rp.bandom(2, 4);
                var ampl = math.random(0.5);

                return fn(diameter, centre, freq, ampl);
            })(),
            weight: 1,
        },
        {
            // real imag trap

            fn: (function()
            {
                var fn = R.curry(function reimTrap(diameter, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var y = functal.finite(z.im * z.re) - diameter;

                        return y;

                    }, result.zs);

                    var y = functal.modifierReduce(vals) / math.max(R.map(math.abs, vals));

                    return y;
                });

                var diameter = Rp.bandom(1, -2);

                return fn(diameter);
            })(),
            weight: 0,
        },
    ];
}());
