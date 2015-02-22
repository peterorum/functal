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
        fn: function real(functal, result)
        {
            var vals = fp.map(function(z)
            {
                return z.re;
            }, result.zs);

            return functal.modifierReduce(vals);
        },
        weight: 1000000,
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
    }];

}());
