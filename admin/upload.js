(
    function()
    {
        "use strict";

        // upload all images to s3

        // mogrify -quality 80 -format jpg *.png

        var R = require('ramda');
        var Q = require('q');
        var fs = require('fs');

        var s3 = require('../s3client');

        var bucket = 'functal-images';

        var files = fs.readdirSync('downloads');

        var step = Q(); // jshint ignore:line

        R.forEach(function(f)
        {
            step = step.then(function()
            {
                return s3.upload(bucket, f, 'downloads/' + f)
                    .then(function()
                    {
                        return fs.unlink('downloads/' + f);
                    });
            });
        }, files);
    }()
);
