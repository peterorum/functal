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

        var promise = require("bluebird");
        var mongodb = promise.promisifyAll(require("mongodb"));

        var bucket = 'functal-images';
        var bucketJson = 'functal-json';

        var images = [];

        //--------- throttle

        var throttle = function(fn, wait)
        {
            return debounce(fn, wait,
            {
                leading: true,
                trailing: true,
                maxWait: wait
            });
        };

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

        //--------- database

        mongodb.connectAsync(process.env.mongo_functal).then(function(db)
        {
            //------- db functions

            var listVotes = function()
            {
                var collection = db.collection('images');

                collection.find().toArrayAsync().then(function(docs)
                {
                    console.log(docs);
                });
            };

            // temp test

            listVotes();

            //--- image list refresh

            // hourly
            var getImagesHourly = throttle(getImageList, 60 * 60000);

            // after admin
            var getImagesSoon = debounce(getImageList, 1 * 60000);

            // initial load of image list

            getImagesHourly();

            // --- start express

            http.createServer(app).listen(process.env.PORT || 8083);

            //--- routing

            // files
            app.get(/\.(js|css|png|jpg|html)$/, function(req, res)
            {
                var uri = url.parse(req.url, true, false);

                sendFile(res, uri.pathname);
            });

            // home page
            app.get('/', function(req, res)
            {
                listVotes();

                sendFile(res, '/views/index.html');
            });

            app.get('/getimages', function(req, res)
            {
                // throttled
                getImagesHourly();

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
                getImagesSoon();
            });

        })
        .catch(function(e)
        {
            console.log(e.message);
            throw e;
        });
    }()
);
