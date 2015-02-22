(function()
{
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    // modifying the final result
    // return -1..1

    exports.modifiers = [
    {
        // identity

        fn: function identity( /* functal, result */ )
        {
            return 0;
        },
        weight: 1,
    },
    {
        fn: function angle(functal, result)
        {
            var lastz = fp.last(result.zs);

            var val = math.atan2(lastz.re, lastz.im) / math.pi;

            return val;
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
                var modified;

                var lastz = fp.last(result.zs);

                var z1 = math.subtract(lastz, params.centre);

                var distance = math.sqrt(math.norm(z1));

                if (math.abs(distance - params.diameter) < params.band)
                {
                    modified = math.max(-1, math.min(1, distance - params.diameter));
                }
                else
                {
                    modified = 0;//params.outside;
                }

                return modified;
            };

            fn.params = params;

            fn.setParams = function()
            {
                params.diameter = fp.bandom(1, -2);
                params.band = fp.bandom(1, -3);
                params.outside = math.random(-1, 1);
                params.centre = math.complex(fp.bandom(1, 2) * fp.randomSign() - 1, fp.bandom(1, 2) * fp.randomSign());
            };

            fn.setParams();

            return fn;
        })(),


        weight: 1,
    }];

}());
