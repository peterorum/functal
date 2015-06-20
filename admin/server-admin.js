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
        var debounce = require('lodash.debounce');

        var s3 = require('../s3client');

        var bucket = 'functal-images';
        var bucketJson = 'functal-json';

        //--------- serve a file

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

        //---------- get images on s3

        var getImageList = function()
        {
            console.log('load list from s3', (new Date()).toString());

            s3.list(bucket).then(function(result)
            {
                // console.log(result.files);

                images = R.pluck('Key', result.files);
                images = R.reverse(images);

                console.log('images', images.length);
            });
        };

        // call at most once every 5 minutes
        var getImages = debounce(getImageList, 5 * 60000,
        {
            leading: true,
            trailing: false
        });

        getImages();

        // --- start express

        http.createServer(app).listen(process.env.PORT || 8083);

        // load image list
        var images = [];

        getImages();

        //---

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

        app.get('/getimages', function(req, res)
        {
            // debounced - update some time after this call
            getImages();

            res.jsonp(
            {
                images: images
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

            // remove from local list
            images = R.reject(function(img)
            {
                return img === key;
            }, images);

            // debounced update
            getImages();


        });

    }()
);
