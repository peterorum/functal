// https://gist.github.com/peterorum/ef28575a518ef3f5db21

(function()
{
    "use strict";

    var fs = require('fs');
    var Q = require('q');

    exports.readFile = Q.nfbind(fs.readFile);
    exports.writeFile = Q.nfbind(fs.writeFile);

})();
