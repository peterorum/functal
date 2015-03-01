(function()
{
    "use strict";

    // preassign resuable arrays up to a size

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var vecs = [];

    exports.createArrays = function(maxLength)
    {
        if (fp.isEmpty(vecs))
        {
            fp.times(function(i)
            {

                vecs[i] = new Array(i);
            }, maxLength + 1);
        }
    };

    exports.getArray = function(size)
    {
        return vecs[size];
    };

}());
