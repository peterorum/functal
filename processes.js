(function()
{
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    // additional functions beyond the traditional z^2 + c

    var applyFn = function(fn, z, c)
    {
        var a = fn(z);
        var z2 = math.multiply(a, c);

        if (!fp.isFinite(z2.re) || fp.isNaN(z2.re))
        {
            z2.re = this.limit;
        }

        if (!fp.isFinite(z2.im) || fp.isNaN(z2.im))
        {
            z2.im = this.limit;
        }

        return z2;
    };

    exports.processes = [
        {
            name: 'z2plusc',
            weight: 1,
            fn: function(z, c)
            {
                return math.chain(z)
                    .pow(2)
                    .add(c)
                    .done();
            }
        },
        {
            name: 'znplusc',
            weight: 1,
            fn: function(z, c)
            {
                return math.chain(z)
                    .pow(this.pow)
                    .add(c)
                    .done();
            }
        },
        {
            name: 'coszc',
            weight: 1,
            fn: function(z, c)
            {
                // convert to radians up to 2pi
                var zr = math.complex(math.mod(z.re, math.pi * 2), math.mod(z.im, math.pi * 2));

                // pass this (the functal object) as the context
                return applyFn.call(this, math.cos, zr, c);
            }
        },
        {
            name: 'acoszc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFn.call(this, math.acos, z, c);
            }
        },
        {
            name: 'cotzc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFn.call(this, math.cot, z, c);
            }
        },
        {
            name: 'cothzc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFn.call(this, math.coth, z, c);
            }
        },
        {
            name: 'csczc',
            weight: 10000,
            fn: function(z, c)
            {
                return applyFn.call(this, math.csc, z, c);
            }
        },

    ];

}());
