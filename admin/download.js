(
    function()
    {
        "use strict";

        // download all images from s3

        // mogrify -quality 80 -format jpg *.png

        var R = require('ramda');
        var Q = require('q');
        var fs = require('fs');

        var s3 = require('../s3client');

        var bucket = 'functal-images';

        s3.list(bucket).then(function(result)
        {
            // console.log(result.files[0]);

            var step = Q(); // jshint ignore:line

            R.forEach(function(img)
            {
                if (/png$/.test(img.Key))
                {
                    if (!fs.existsSync('downloads/' + img.Key))
                    {
                        step = step.then(function()
                        {
                            return s3.download(bucket, img.Key, 'downloads/' + img.Key);
                        });
                    }
                }
            }, result.files);

        });

    }()
);
