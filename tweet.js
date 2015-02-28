(function()
{
    "use strict";

    // tweet & delete oldest file

    var fsq = require('./fsq');

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var twit = require('./tweet-media');

    var msg = '#fractal #functal';

    var isDev = (process.env.TERM_PROGRAM === 'Apple_Terminal');

    var functalsFolder = isDev ? 'functals' : process.env.HOME + '/Dropbox/functals';

    var folder = functalsFolder + '/medium/';

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

            fsq.unlink(file).then(function()
            {
                fsq.unlink(file.replace(/\.png/, '.json'));
            });
        }
        else
        {
            console.log('no file');
        }
    });
}());
