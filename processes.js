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
            name: 'zc',
            weight: 1,
            fn: function(z, c)
            {
                return math.multiply(z, c);
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
            weight: 0.2, // good, but too easily picked
            fn: function(z, c)
            {
                return applyFnMultC.call(this, math.csc, z, c);
            }
        },
        {
            name: 'cschzc',
            weight: 0.2, // good, but too easily picked
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
            weight: 0.5,
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
            weight: 0.04, // good, but too easily chosen, so reduce weight
            fn: (function()
            {
                // options will be the same for the entire run
                var trig = Rp.wandom([math.sin, math.cos]);

                // keep inside anon function so they are constant
                var fxtrigy = {
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
                    if (!this.fxtrigy)
                    {
                        this.fxtrigy = fxtrigy;
                    }

                    var zr = math.complex(math.mod(z.re, math.pi * 2), math.mod(z.im, math.pi * 2));

                    var fim = fxtrigy.ampl1 * fxtrigy.fn(fxtrigy.freq1 * zr.im);
                    var fre = fxtrigy.ampl2 * fxtrigy.fn(fxtrigy.freq2 * zr.re);

                    var z2 = math.complex(z.re - fim, z.im - fre);

                    return this.finite(z2);
                };
            })()
        },
        {
            // adjust real & imag parts with function of the opposite
            name: 'fxfny',
            weight: 0.05, // good, but too easily chosen, so reduce weight
            fn: (function()
            {
                var funcs = R.times(function()
                {
                    // todo: add ampl & freq to sin
                    return Rp.wandom([math.square, math.sin, R.compose(math.log, math.abs)]);
                }, 2);

                var fxfny = R.map(Rp.nameOf, funcs);

                // the actual process function

                return function(z /*, c */ )
                {
                    // store options on first call
                    if (!this.fxfny)
                    {
                        this.fxfny = fxfny;
                    }

                    var z2 = math.complex(this.finite(z.re + funcs[0](z.im)), this.finite(z.im + funcs[1](z.re)));

                    return this.finite(z2);
                };
            })()
        },
    ];

}());
