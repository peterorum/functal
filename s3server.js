(function()
{
    "use strict";

    // responds with list of s3 images

    // should always be running
    // nohup node s3server&

    var http = require('http');
    var url = require('url');
    var R = require('ramda');
    var s3 = require('./s3client');

    var bucket = 'functal-images';

    http.createServer(function(req, res)
    {
        var request = url.parse(req.url, true);
        var action = request.pathname;

        if (action === '/images')
        {
            res.writeHead(200,
            {
                'Content-Type': 'application/json'
            });

            s3.list(bucket).then(function(result)
            {
                var images = R.pluck('Key', result.files);

                res.end(JSON.stringify(images, null, 2));
            });
        }
    }).listen(8082);


})();
