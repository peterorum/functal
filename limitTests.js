(function() {
    "use strict";

    var math = require('mathjs');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    // just tests on the las z rather than all zs due to speed & memory

    exports.tests = [{
        name: 'norm',
        weight: 1,
        fn: function(z) {
            return math.norm(z) >= this.limit;
        }
    }, {
        name: 'sum',
        weight: 1,
        fn: function(z) {
            return math.abs(z.re) + math.abs(z.im) >= this.limit;
        }
    }, {
        name: 'product',
        weight: 1,
        fn: function(z) {
            return math.abs(z.re) * math.abs(z.im) >= this.limit;
        }
    }, {
        name: 'diff',
        weight: 1,
        fn: function(z) {
            return math.abs(z.re - z.im) >= this.limit;
        }
    }, {
        name: 'maxabs',
        weight: 1,
        fn: function(z) {
            return math.max(math.abs(z.re), math.abs(z.im)) >= this.limit;
        }
    }, {
        name: 'minabs',
        weight: 1,
        fn: function(z) {
            return math.min(math.abs(z.re), math.abs(z.im)) >= this.limit;
        }
    }];
}());
