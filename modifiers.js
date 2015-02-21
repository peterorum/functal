(function()
{
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    // modifying the final result
    // return 0..1

    exports.modifiers = [
    {
        // identity

        fn: function identity(functal, result)
        {
            return result.zs.length / functal.maxCount;
        },
        weight: 1,
    },
    {
        fn: function angle(functal, result)
        {
            var lastz = fp.last(result.zs);

            var val = (math.atan2(lastz.re, lastz.im) / math.pi + 1.0) / 2.0;

            return val;
        },
        weight: 1,
    },
    {
        // circle trap

        fn: (function()
        {
            var params = {};

            params.diameter = fp.bandom(1, -2);
            params.band = fp.bandom(1, -3);
            params.outside = math.random(1);
            params.centre = math.complex(fp.bandom(1, 2), fp.bandom(1, 2));

            var fn = function circleTrap(functal, result)
            {
                var modified;

                var lastz = fp.last(result.zs);

                var z1 = math.subtract(lastz, params.centre);

                var distance = math.sqrt(math.norm(z1));

                if (math.abs(distance - params.diameter) < params.band)
                {
                    modified = math.abs(distance - params.diameter);
                }
                else
                {
                    modified = params.outside;
                }

                return modified;
            };

            fn.params = params;
            return fn;
        })(),


        weight: 10000,
    }];

}());
