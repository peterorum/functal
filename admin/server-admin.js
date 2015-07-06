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
        var queryString = require('querystring');
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

        //--------- sync votes

        var updateMemoryImage = function(doc)
        {
            var image = R.find(function(i)
            {
                return i.name === doc.name;
            }, images);

            if (image)
            {
                image.likes = doc.likes;
                image.dislikes = doc.dislikes;

                console.log("Votes found:", image);
            }
        };

        //--------- load votes

        var loadVotes = function(db)
        {
            return new Promise(function(resolve, reject)
            {
                var dbImages = db.collection('images');

                dbImages.find(
                {
                    name:
                    {
                        $in: R.pluck('name', images)
                    }
                }).toArrayAsync().then(function(docs)
                {
                    // set votes in memory

                    R.forEach(function(doc)
                    {
                        updateMemoryImage(doc);

                    }, docs);

                    resolve();
                }, function(err)
                {
                    reject("error in loadVotes:" + err);
                });
            });
        };

        //---------- get images on s3

        var getImageList = function(db)
        {
            return new Promise(function(resolve, reject)
            {
                console.log('load list from s3', (new Date()).toString());

                s3.list(bucket).then(function(result)
                {
                    // console.log(result.files);

                    images = R.map(function(img)
                    {
                        return {
                            name: img.Key,
                            likes: 0,
                            dislikes: 0
                        };
                    }, result.files);

                    images = R.reverse(images);

                    // load votes
                    loadVotes(db).then(function()
                    {
                        resolve();
                    });

                }, function()
                {
                    reject('error in getImageList');
                });
            });
        };

        //--------- database

        mongodb.connectAsync(process.env.mongo_functal).then(function(db)
            {
                //------- db functions

                var dbImages = db.collection('images');

                // db setup
                // db.images.createIndex({name: 1})

                // debug
                var listVotes = function()
                {
                    dbImages.find().toArrayAsync().then(function(docs)
                    {
                        console.log(docs);
                    });
                };

                //--- image list refresh

                // hourly
                var getImagesHourly = throttle(getImageList, 60 * 60000);

                // after admin
                var getImagesSoon = debounce(getImageList, 1 * 60000);

                // initial load of image list

                getImagesHourly(db).then(function()
                {
                    console.log('images', images.length);
                });

                // --- start express

                http.createServer(app).listen(process.env.PORT || 8083);

                //--- routing

                //------------ files
                app.get(/\.(js|css|png|jpg|html)$/, function(req, res)
                {
                    var uri = url.parse(req.url, true, false);

                    sendFile(res, uri.pathname);
                });

                //------------- home page
                app.get('/', function(req, res)
                {
                    listVotes();

                    sendFile(res, '/views/index.html');
                });

                app.get('/getimages', function(req, res)
                {
                    // throttled
                    getImagesHourly(db);

                    res.jsonp(
                    {
                        images: images
                    });
                });

                //------------- delete image on s3
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
                    getImagesSoon(db);
                });

                //---------- vote
                app.get('/vote', function(req, res)
                {
                    var uri = url.parse(req.url);
                    var query = queryString.parse(uri.query);
                    var data = JSON.parse(query.data);

                    // updates image votes, adding to db if necessary

                    dbImages.findOneAsync(
                    {
                        name: data.name
                    }).then(function(image)
                    {
                        if (!image)
                        {
                            image = {
                                name: data.name,
                                likes: data.like,
                                dislikes: data.dislike
                            };
                        }
                        else
                        {
                            image.likes += data.like;
                            image.dislikes += data.dislike;
                        }

                        dbImages.update(
                            {
                                name: image.name
                            },
                            image,
                            {
                                upsert: true
                            });

                        updateMemoryImage(image);

                        res.jsonp(
                        {
                            status: 'ok',
                            image: image
                        });
                    });
                });
            })
            .catch(function(e)
            {
                console.log('mongo error', e.message);
                console.log('did you?:\nmongod --config /usr/local/etc/mongod.conf');
                throw e;
            });
    }());
