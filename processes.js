(function()
{
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

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

            return math.chain(zr)
                .cos()
                .multiply(c)
                .done();
        }
    }, ];

}());
