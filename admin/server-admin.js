(
    function()
    {
        "use strict";

        // must always be running
        // nohup node server-admin&

        var express = require('express');

        var app = express();
        var bodyParser = require("body-parser");

        app.disable('view cache');
        app.set('json spaces', 4);
        app.use(bodyParser.urlencoded(
        {
            extended: true
        }));
        app.use(bodyParser.json());

        var http = require('http');
        var url = require('url');
        var path = require('path');
        var R = require('ramda');

        var s3 = require('../s3client');

        var bucket = 'functal-images';
        var bucketJson = 'functal-json';

        http.createServer(app).listen(process.env.PORT || 8083);

        var sendFile = function(res, filename)
        {
            var filepath = path.join(process.cwd(), filename);

            res.sendFile(filepath, function(err)
            {
                if (err)
                {
                    console.log(err);
                    res.status(err.status).end();
                }
                else
                {
                    // console.log('Sent:', filename);
                }
            });
        };

        // files
        app.get(/\.(js|css|png|jpg|html)$/, function(req, res)
        {
            var uri = url.parse(req.url, true, false);

            sendFile(res, uri.pathname);
        });

        // home page
        app.get('/', function(req, res)
        {
            sendFile(res, '/views/index.html');
        });

        // get images on s3
        app.get('/getimages', function(req, res)
        {
            s3.list(bucket).then(function(result)
            {
                // console.log(result.files);

                var images = R.pluck('Key', result.files);
                images = R.reverse(images);

                res.jsonp(
                {
                    images: images
                });

            });
        });

        // delete image on s3
        app.post('/delete', function(req, res)
        {
            var key = req.body.key;

            s3.delete(bucket, key)
                .then(function()
                {
                    return s3.delete(bucketJson, key.replace(/(png|jpg)$/, 'json'));
                })
                .then(function(result)
                {
                    res.json(result);
                });
        });

    }()
);
