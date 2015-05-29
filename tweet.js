(function()
{
    "use strict";

    // tweet & delete oldest file
    // download it from s3 & delete it

    var fsq = require('./fsq');
    var s3 = require('./s3client');
    var twit = require('./tweet-media');

    var msg = '#fractal #functal #digitalart';

    var bucket = 'functal-images';
    var bucketJson = 'functal-json';

    s3.list('functal-images').then(function(result)
    {
        if (result.count === 0)
        {
            console.log('No files');
        }
        else
        {
            var oldestKey = result.files[0].Key;

            var tmpFile = '/tmp/tweet-' + oldestKey;

            s3.download(bucket, oldestKey, tmpFile).then(function()
            {
                twit.tweet(msg, tmpFile, function()
                {
                    // delete image
                    s3.delete(bucket, oldestKey)
                        .then(function()
                        {
                            // delete json
                            return s3.delete(bucketJson, oldestKey.replace(/(png|jpg)$/, 'json'));
                        })
                        .then(function()
                        {
                            // delete local file
                            return fsq.unlink(tmpFile);
                        })
                        .done();
                });
            });
        }
    });
}());
