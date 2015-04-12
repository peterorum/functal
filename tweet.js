(function()
{
    "use strict";

    // tweet & delete oldest file

    var fsq = require('./fsq');

    var R = require('ramda');

    var twit = require('./tweet-media');

    var msg = '#fractal #functal #digitalart';

    var isDev = (process.env.TERM_PROGRAM === 'Apple_Terminal');

    var functalsFolder = isDev ? 'functals' : process.env.HOME + '/Dropbox/functals';

    var folder = functalsFolder + '/medium/';

    fsq.readdir(folder).then(function(files)
    {
        var file = R.find(function(f)
        {
            return /\.png$/.test(f);
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
