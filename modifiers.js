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

        fn: function circleTrap(functal, result)
        {
            var modified;

            var diameter = 0.2;
            var band = 1;
            var outside = 0.5;
            var centre = math.complex(0, 0);

            var lastz = fp.last(result.zs);


            var z1 = math.subtract(lastz, centre);

            var distance = math.sqrt(math.norm(z1));

            if (math.abs(distance - diameter) < band)
            {
                modified = math.abs(distance - diameter);
            }
            else
            {
                modified = outside;
            }

            return modified;
        },
        weight: 10000,
    }];

}());
