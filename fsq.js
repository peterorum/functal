(function()
{
    "use strict";

    var fs = require('fs');
    var Q = require('q');

    exports.readFile = Q.nfbind(fs.readFile);
    exports.writeFile = Q.nfbind(fs.writeFile);
    exports.createWriteStream = Q.nfbind(fs.createWriteStream);

})();
