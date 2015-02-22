(function()
{
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    // modifying the final result
    // return -1..1

    exports.reducers = [
    {
        fn: fp.last,
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
    },
    {
        fn: math.std,
        weight: 1
    }, ];

    exports.modifiers = [
        {
            fn: function angle(functal, result)
            {
                var vals = fp.map(function(z)
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
                var vals = [];

                fp.forEach(function(z, i, zs)
                {
                    var x = 0;

                    if (i > 0)
                    {
                        var z1 = zs[i - 1];
                        var z2 = math.subtract(zs[i], z1);

                        x = math.atan2(z2.re, z2.im) / math.pi;
                    }

                    vals.push(x);

                }, result.zs);

                return functal.modifierReduce(vals);
            },
            weight: 1,
        },
        {
            fn: function real(functal, result)
            {
                var max = math.max(fp.map(function(z)
                {
                    return math.abs(z.re);
                }, result.zs));

                var vals = fp.map(function(z)
                {
                    return z.re / max;
                }, result.zs);

                return functal.modifierReduce(vals);
            },
            weight: 1,
        },

        {
            fn: function norm(functal, result)
            {
                var vals = fp.map(function(z)
                {
                    return math.norm(z) / functal.limit;
                }, result.zs);

                return functal.modifierReduce(vals);
            },
            weight: 1,
        },
        {
            // circle trap

            fn: (function()
            {
                var params = {};

                var fn = function circleTrap(functal, result)
                {
                    var x;

                    var vals = fp.map(function(z)
                    {
                        var z1 = math.subtract(z, params.centre);

                        var distance = math.sqrt(math.norm(z1));

                        if (math.abs(distance - params.diameter) < params.band)
                        {
                            x = math.max(-1, math.min(1, distance - params.diameter));
                        }
                        else
                        {
                            x = 0;
                        }

                        return x;
                    }, result.zs);

                    return functal.modifierReduce(vals);
                };

                fn.params = params;

                fn.setParams = function()
                {
                    params.diameter = fp.bandom(1, -2);
                    params.band = fp.bandom(1, -3);
                    params.centre = math.complex(fp.bandom(1, 2) * fp.randomSign() - 1, fp.bandom(1, 2) * fp.randomSign());
                };

                fn.setParams();

                return fn;
            })(),
            weight: 1,
        },
        {
            // real circle trap

            fn: (function()
            {
                var params = {};

                var fn = function realCircleTrap(functal, result)
                {
                    var vals = fp.map(function(z)
                    {
                        var x = math.mod(z.re - params.centre, 1);

                        return math.sqrt(math.max(0, 1.0 - x * x));

                    }, result.zs);

                    return functal.modifierReduce(vals);
                };

                fn.params = params;

                fn.setParams = function()
                {
                    params.centre = math.random(-1, 1);
                };

                fn.setParams();

                return fn;
            })(),
            weight: 1,
        },
        {
            fn: function sinreal(functal, result)
            {
                var vals = fp.map(function(z)
                {
                    return math.sin(z.re * math.pi);
                }, result.zs);

                return functal.modifierReduce(vals);
            },
            weight: 1,
        },
        {
            // box trap

            fn: (function()
            {
                var params = {};

                var fn = function boxTrap(functal, result)
                {
                    var vals = fp.map(function(z)
                    {
                        var z1 = math.subtract(z, params.centre);

                        var x = math.abs(z1.re);
                        var y = math.abs(z1.im);

                        var dist = math.max(x, y);

                        return math.mod(dist - params.diameter, 1);

                    }, result.zs);

                    return functal.modifierReduce(vals) / math.max(vals);
                };

                fn.params = params;

                fn.setParams = function()
                {
                    params.diameter = fp.bandom(1, -2);
                    params.centre = math.complex(fp.bandom(1, 2) * fp.randomSign() - 1, fp.bandom(1, 2) * fp.randomSign());
                };

                fn.setParams();

                return fn;
            })(),
            weight: 1,
        },

    ];

}());
