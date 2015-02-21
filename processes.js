(function()
{
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var finite = function(z2, max)
    {
        if (!fp.isFinite(z2.re) || fp.isNaN(z2.re))
        {
            z2.re = max;
        }

        if (!fp.isFinite(z2.im) || fp.isNaN(z2.im))
        {
            z2.im = max;
        }

        return z2;
    };

    // additional functions beyond the traditional z^2 + c

    var applyFnMultC = function(fn, z, c)
    {
        var a = fn(z);
        var z2 = math.multiply(a, c);

        return finite(z2, this.limit);
    };

    var applyFnMultZ = function(fn, z, zr, c)
    {
        var a = fn(zr);
        var z2 = math.chain(a).multiply(z).add(c).done();

        return finite(z2, this.limit);

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
                return applyFnMultC.call(this, math.cos, zr, c);
            }
        },
        {
            name: 'acoszc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFnMultC.call(this, math.acos, z, c);
            }
        },
        {
            name: 'cotzc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFnMultC.call(this, math.cot, z, c);
            }
        },
        {
            name: 'cothzc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFnMultC.call(this, math.coth, z, c);
            }
        },
        {
            name: 'csczc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFnMultC.call(this, math.csc, z, c);
            }
        },
        {
            name: 'cschzc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFnMultC.call(this, math.csch, z, c);
            }
        },
        {
            name: 'expzc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFnMultC.call(this, math.exp, z, c);
            }
        },
        {
            name: 'logzc',
            weight: 1,
            fn: function(z, c)
            {
                return applyFnMultC.call(this, math.log, z, c);
            }
        },
        {
            name: 'zsinz',
            weight: 1,
            fn: function(z, c)
            {
                var zr = math.complex(math.mod(z.re, math.pi * 2), math.mod(z.im, math.pi * 2));

                return applyFnMultZ.call(this, math.sin, z, zr, c);
            }
        },
        {
            name: 'z2sinz',
            weight: 100000,
            fn: function(z, c)
            {
                var zr = math.complex(math.mod(z.re, math.pi * 2), math.mod(z.im, math.pi * 2));

                return applyFnMultZ.call(this, math.sin, math.multiply(z, z), zr, c);
            }
        },
        {
            name: 'z2plussinzplusc',
            weight: 1,
            fn: function(z, c)
            {
                var zr = math.complex(math.mod(z.re, math.pi * 2), math.mod(z.im, math.pi * 2));
                var szr = finite(math.sin(zr), this.limit);

                return math.chain(z)
                    .pow(2)
                    .add(szr)
                    .add(c)
                    .done();
            }
        },

        {
            //adjust real & imag parts with function of the opposite
            name: 'fxy',
            weight: 10000000,
            fn: (function()
            {
                var trig = fp.wandom([math.sin, math.cos]);

                var fxy = {
                    ampl1: math.random(0.2),
                    ampl2: math.random(0.2),
                    freq1: math.random(30),
                    freq2: math.random(30),
                    fn : trig,
                    name: fp.nameOf(trig)
                };

                return function(z)
                {
                    // store options
                    if (! this.fxy)
                    {
                        this.fxy = fxy;
                    }

                    var zr = math.complex(math.mod(z.re, math.pi * 2), math.mod(z.im, math.pi * 2));

                    var fim = fxy.ampl1 * fxy.fn(fxy.freq1 * zr.im);
                    var fre = fxy.ampl2 * fxy.fn(fxy.freq2 * zr.re);

                    var z2 = math.complex(z.re - fim, z.im - fre);

                    return finite(z2, this.limit);
                };
            })()
        },
    ];

}());
