(function()
{
    "use strict";

    // tweet & delete oldest file

    var fsq = require('./fsq');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var twit = require('./tweet-media');

    var msg = '#fractal #functal';

    var folder = 'functals/medium/';

    fsq.readdir(folder).then(function(files)
    {
        var file = fp.find(function(f)
        {
            return fp.endsWith('.png', f);
        }, files);

        if (file)
        {
            file = folder + file;

            console.log(file);

            twit.tweet(msg, file);

            fsq.unlink(folder + file).then(function()
            {
                fsq.unlink(folder + file.replace(/\.png/, '.json'));
            });
        }
        else
        {
            console.log('no file');
        }
    });



}());
