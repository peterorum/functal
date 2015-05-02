(function()
{
    "use strict";

    // tweet & delete oldest file
    // download it from s3 & delete it

    var s3 = require('./s3client');

    var R = require('ramda');

    var twit = require('./tweet-media');

    var msg = '#fractal #functal #digitalart';

    // var isDev = (process.env.TERM_PROGRAM === 'Apple_Terminal');

    var bucket = 'functal-images';
    var bucketJson = 'functal-json';

    s3.list('functal-images').then(function(result)
    {
        // console.log(result);

        if (result.count === 0)
        {
            console.log('No files');
        }
        else
        {
            var oldestKey = result.files[0].Key;

            console.log(oldestKey);

            var tmpFile = '/tmp/tweet-' + oldestKey;

            s3.download(bucket, oldestKey, tmpFile).then(function()
            {
                console.log('tweeting');

                twit.tweet(msg, tmpFile, function()
                {
                console.log('tweeted');

                    s3.delete(bucket, oldestKey)
                        .then(function()
                        {
                            return s3.delete(bucketJson, oldestKey.replace(/png$/, 'json'));
                        })
                        .done();
                });
            });
        }
    });
}());
