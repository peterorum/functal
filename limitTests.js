(function() {
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    exports.tests = [{
        name: 'norm',
        weight: 1,
        fn: function(zs) {
            var z = fp.last(zs);

            return math.norm(z) > this.limit;
        }
    }, {
        name: 'sum',
        weight: 1,
        fn: function(zs) {
            var z = fp.last(zs);

            return math.abs(z.re) + math.abs(z.im) > this.limit;
        }
    }, {
        name: 'product',
        weight: 1,
        fn: function(zs) {
            var z = fp.last(zs);

            return math.abs(z.re) * math.abs(z.im) > this.limit;
        }
    }, {
        name: 'diff',
        weight: 1,
        fn: function(zs) {
            var z = fp.last(zs);

            return math.abs(z.re - z.im) > this.limit;
        }
    }, {
        name: 'maxabs',
        weight: 1,
        fn: function(zs) {
            var z = fp.last(zs);

            return math.max(math.abs(z.re), math.abs(z.im)) > this.limit;
        }
    }, {
        name: 'minabs',
        weight: 1,
        fn: function(zs) {
            var z = fp.last(zs);

            return math.min(math.abs(z.re), math.abs(z.im)) > this.limit;
        }
    }, {
        name: 'converge',
        weight: 100000,
        fn: function(zs) {
            var done = false;

            if (zs.length > 1) {
                var z2 = zs[zs.length - 2];
                var z1 = zs[zs.length - 1];

                var diff = math.abs(math.subtract(z1, z2));

                return diff < 0.000001;
            }

            return done;
        }
    }];
}());
