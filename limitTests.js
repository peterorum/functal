(function()
{
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    exports.tests = [
        {
            name: 'norm',
            weight: 1,
            fn: function(z)
            {
                return math.norm(z);
            }
        },
        {
            name: 'sum',
            weight: 1,
            fn: function(z)
            {
                return math.abs(z.re) + math.abs(z.im);
            }
        },
        {
            name: 'product',
            weight: 1,
            fn: function(z)
            {
                return math.abs(z.re) * math.abs(z.im);
            }
        },
        {
            name: 'diff',
            weight: 10000,
            fn: function(z)
            {
                return math.abs(z.re - z.im);
                // return math.abs(z.re) - math.abs(z.im);
            }
        },
        {
            name: 'maxabs',
            weight: 1,
            fn: function(z)
            {
                return math.max(math.abs(z.re), math.abs(z.im));
            }
        },
        {
            name: 'minabs',
            weight: 1,
            fn: function(z)
            {
                return math.min(math.abs(z.re), math.abs(z.im));
            }
        }
    ];
}());
