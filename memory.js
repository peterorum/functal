(function()
{
    "use strict";

    // preassign resuable arrays up to a size

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var vecs = {};

    exports.createArrays = function(key, maxLength)
    {
        if (! vecs[key])
        {
            vecs[key] = [];

            fp.times(function(i)
            {

                vecs[key][i] = new Array(i);
            }, maxLength + 1);
        }
    };

    exports.getArray = function(key, size)
    {
        return vecs[key][size];
    };

}());
