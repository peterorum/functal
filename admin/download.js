(
    function()
    {
        "use strict";

        // download all images from s3

        var R = require('ramda');
        var Q = require('q');

        var s3 = require('../s3client');

        var bucket = 'functal-images';

        s3.list(bucket).then(function(result)
        {
            // console.log(result.files[0]);

            var step = Q(); // xjshint ignore:line

            R.forEach(function(img)
            {
                if (/png$/.test(img.Key))
                {
                    step = step.then(function()
                    {
                        return s3.download('functal-images', img.Key, 'downloads/' + img.Key);
                    });
                }
            }, R.take(result.files));

        });

    }()
);
