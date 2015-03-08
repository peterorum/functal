(function()
{
    "use strict";

    var math = require('mathjs');

    var R = require('ramda');
    var Rp = require('./plus-fp/plus-fp');

    // additional functions beyond the traditional z^2 + c

    var applyFnMultC = function(fn, z, c)
    {
        var a = fn(z);
        var z2 = math.multiply(a, c);

        return this.finite(z2);
    };

    var applyFnMultZ = function(fn, z, zr, c)
    {
        var a = fn(zr);
        var z2 = math.chain(a).multiply(z).add(c).done();

        return this.finite(z2);

    };

    exports.processes = [
        {
            name: 'z2plusc',
            weight: 1,
            fn: function(z, c)
            {
                return math.chain(z)
                    .square()
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
            weight: 1,
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
                var szr = this.finite(math.sin(zr));

                return math.chain(z)
                    .pow(2)
                    .add(szr)
                    .add(c)
                    .done();
            }
        },

        {
            name: 'znplusxyplusc',
            weight: 1,
            fn: (function()
            {
                var znplusxyplusc = {
                    xfactor: math.random(5),
                    yfactor: math.random(5)
                };

                return function(z, c)
                {
                    if (!this.znplusxyplusc)
                    {
                        this.znplusxyplusc = znplusxyplusc;
                    }

                    return this.finite(math.chain(z)
                        .pow(this.pow)
                        .add(znplusxyplusc.xfactor * z.re)
                        .add(znplusxyplusc.yfactor * z.im)
                        .add(c)
                        .done());
                };
            })()
        },
        {
            // adjust real & imag parts with function of the opposite
            name: 'fxtrigy',
            weight: 0.25, // good, but too easily chosen, so reduce weight
            fn: (function()
            {
                // options will be the same for the entire run
                var trig = Rp.wandom([math.sin, math.cos]);

                // keep inside anon function so they are constant
                var fxy = {
                    ampl1: math.random(0.2),
                    ampl2: math.random(0.2),
                    freq1: math.random(20),
                    freq2: math.random(20),
                    fn: trig,
                    name: Rp.nameOf(trig)
                };

                // the actual process function

                return function(z /*, c */ )
                {
                    // store options on first call
                    if (!this.fxy)
                    {
                        this.fxy = fxy;
                    }

                    var zr = math.complex(math.mod(z.re, math.pi * 2), math.mod(z.im, math.pi * 2));

                    var fim = fxy.ampl1 * fxy.fn(fxy.freq1 * zr.im);
                    var fre = fxy.ampl2 * fxy.fn(fxy.freq2 * zr.re);

                    var z2 = math.complex(z.re - fim, z.im - fre);

                    return this.finite(z2);
                };
            })()
        },
        // {
        //     // adjust real & imag parts with function of the opposite
        //     name: 'fxplusy',
        //     weight: 1000000.25, // good, but too easily chosen, so reduce weight
        //     fn: (function()
        //     {
        //         // the actual process function

        //         return function(z /*, c */ )
        //         {
        //             var z2 = math.complex(z.re + z.im, z.im - z.re);

        //             return this.finite(z2);
        //         };
        //     })()
        // },
            ];

}());
