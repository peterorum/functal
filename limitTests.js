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
        weight: 1,
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
    }, {
        name: 'mean',
        weight: 1,
        fn: function(zs) {
            return math.norm(math.mean(zs)) > this.limit;
        }
    }, {
        name: 'stddev',
        weight: 1,
        fn: function(zs) {
            return math.norm(math.std(zs)) > this.limit;
        }
    }, {
        name: 'prod',
        weight: 1,
        fn: function(zs) {
            return math.norm(math.prod(zs)) > this.limit;
        }
    }, {
        name: 'meannorm',
        weight: 1,
        fn: function(zs) {
            return math.mean(fp.map(math.norm, zs)) > this.limit;
        }
    }, {
        name: 'stddevnorm',
        weight: 1,
        fn: function(zs) {
            return math.std(fp.map(math.norm, zs)) > this.limit;
        }
    }];
}());
