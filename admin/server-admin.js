;(function() {
    'use strict'

    // must always be running by...
    // nohup ./serve&
    // also in /etc/rc.local...
    // sudo -u ec2-user /home/ec2-user/functal/admin/serve&

    var express = require('express')

    var app = express()
    var bodyParser = require('body-parser')

    app.disable('view cache')
    app.set('json spaces', 4)
    app.use(
        bodyParser.urlencoded({
            extended: true
        })
    )
    app.use(bodyParser.json())

    var http = require('http')
    var url = require('url')
    var queryString = require('querystring')
    var path = require('path')
    var R = require('ramda')
    var debounce = require('lodash.debounce')

    var s3 = require('../s3client')

    var promise = require('bluebird')
    var mongodb = promise.promisifyAll(require('mongodb'))
    var mongoClient = promise.promisifyAll(mongodb.MongoClient)

    var bucket = 'functal-images'
    var bucketJson = 'functal-json'

    var images = []

    //--------- throttle

    var throttle = function(fn, wait) {
        return debounce(fn, wait, {
            leading: true,
            trailing: true,
            maxWait: wait
        })
    }

    //--------- serve a file

    var sendFile = function(res, filename) {
        var filepath = path.join(process.cwd(), filename)

        res.sendFile(filepath, function(err) {
            if (err) {
                console.log(err)
                res.status(err.status).end()
            } else {
                // console.log('Sent:', filename);
            }
        })
    }

    //--------- sync votes

    var updateMemoryImage = function(doc) {
        var image = R.find(function(i) {
            return i.name === doc.name
        }, images)

        if (image) {
            image.likes = doc.likes || 0
            image.dislikes = doc.dislikes || 0
            image.caption = doc.caption
        }
    }

    //--------- load votes

    var loadVotes = function(db) {
        return new Promise(function(resolve, reject) {
            db
                .collection('images')
                .find({
                    name: {
                        $in: R.pluck('name', images)
                    }
                })
                .toArrayAsync()
                .then(
                    function(docs) {
                        // set votes in memory

                        R.forEach(function(doc) {
                            updateMemoryImage(doc)
                        }, docs)

                        // add new ones to database
                        let newbies = R.filter(
                            img => !R.find(d => d.name === img.name, docs),
                            images
                        )

                        if (newbies.length) {
                            newbies = R.map(
                                i => ({
                                    name: i.name,
                                    likes: 0,
                                    dislikes: 0
                                }),
                                newbies
                            )

                            db
                                .collection('images')
                                .insertAsync(newbies)
                                .then(function() {
                                    resolve()
                                })
                        } else {
                            resolve()
                        }
                    },
                    function(err) {
                        reject('error in loadVotes:' + err)
                    }
                )
        })
    }

    //---------- get images on s3

    var getImageList = function(db) {
        return new Promise(function(resolve, reject) {
            console.log('load list from s3', new Date().toString())

            s3.list(bucket).then(
                function(result) {
                    console.log('count: ' + result.files.length)

                    images = R.map(function(img) {
                        return {
                            name: img.Key,
                            likes: 0,
                            dislikes: 0,
                            caption: '',
                            title: '',
                            sort: img.LastModified.getTime()
                        }
                    }, result.files)

                    // load votes
                    loadVotes(db).then(function() {
                        var minImagesToKeep = 1000

                        // delete unpopular
                        var unpopular = R.filter(function(i) {
                            return i.dislikes > i.likes
                        }, images)

                        unpopular = R.take(
                            Math.max(
                                0,
                                Math.min(
                                    images.length - minImagesToKeep,
                                    unpopular.length
                                )
                            ),
                            unpopular
                        )

                        R.forEach(function(img) {
                            console.log(
                                'delete ',
                                img.name,
                                'dislikes',
                                img.dislikes,
                                'likes',
                                img.likes
                            )

                            s3
                                .delete(bucket, img.name)
                                .then(function() {
                                    return s3.delete(
                                        bucketJson,
                                        img.name.replace(/(png|jpg)$/, 'json')
                                    )
                                })
                                .then(function() {
                                    return db.collection('images').removeAsync({
                                        name: img.name
                                    })
                                })
                        }, unpopular)

                        // only return popular
                        images = R.filter(function(i) {
                            return (
                                typeof i.likes === 'undefined' ||
                                i.likes >= i.dislikes
                            )
                        }, images)

                        // newsest ones first
                        images = R.sortBy(i => -i.sort, images)

                        // map caption to title for backward compatibility
                        R.forEach(i => {
                            i.title = i.caption
                        }, images)

                        resolve()
                    })
                },
                function(err) {
                    console.log('error in getImageList', err)
                    reject('error in getImageList')
                }
            )
        })
    }

    //--------- database

    mongoClient
        .connectAsync(process.env.mongo_functal)
        .then(function(client) {
            //------- db functions

            var db = client.db('functal')

            // db setup
            // db.images.createIndex({name: 1})

            //--- image list refresh

            // hourly
            var getImagesHourly = throttle(getImageList, 60 * 60000)

            // initial load of image list

            getImagesHourly(db).then(
                function() {
                    console.log('images', images.length)
                },
                function(err) {
                    console.log('error in initial getImagesHourly', err)
                }
            )

            // --- start express

            http.createServer(app).listen(process.env.PORT || 8083)

            //--- routing

            //------------ files
            app.get(/\.(js|css|png|jpg|html)$/, function(req, res) {
                var uri = url.parse(req.url, true, false)

                sendFile(res, uri.pathname)
            })

            //------------- home page
            app.get('/', function(req, res) {
                sendFile(res, '/views/index.html')
            })

            app.get('/getimages', function(req, res) {
                var uri = url.parse(req.url)
                var query = queryString.parse(uri.query)
                var data = JSON.parse(query.data || '{}')

                // throttled
                getImagesHourly(db)

                var imagesResult = images

                if (data.count) {
                    // return limited number of images as requested

                    if (data.sortBy === 'new') {
                        // latest, already sorted
                        imagesResult = R.take(data.count, images)
                    } else {
                        // return a random collection
                        var randomImages = R.sort(function() {
                            return Math.random() < 0.5 ? -1 : 1
                        }, images)

                        imagesResult = R.take(data.count, randomImages)
                    }
                }

                res.jsonp({
                    images: imagesResult
                })
            })

            // //------------- delete image on s3
            // app.post('/delete', function(req, res)
            // {
            //     var key = req.body.key;

            //     s3.delete(bucket, key)
            //         .then(function()
            //         {
            //             return s3.delete(bucketJson, key.replace(/(png|jpg)$/, 'json'));
            //         })
            //         .then(function(result)
            //         {
            //             res.json(result);
            //         });

            //     // remove from local list
            //     images = R.reject(function(img)
            //     {
            //         return img.name === key;
            //     }, images);

            // });

            //---------- vote
            app.get('/vote', function(req, res) {
                var uri = url.parse(req.url)
                var query = queryString.parse(uri.query)
                var data = JSON.parse(query.data)

                // updates image votes, adding to db if necessary

                db
                    .collection('images')
                    .findOneAsync({
                        name: data.name
                    })
                    .then(function(image) {
                        if (!image) {
                            image = {
                                name: data.name,
                                likes: data.like,
                                dislikes: data.dislike,
                                dateLastVote: new Date()
                            }
                        } else {
                            image.likes = Math.max(
                                0,
                                (image.likes || 0) + data.like
                            )
                            image.dislikes = Math.max(
                                0,
                                (image.dislikes || 0) + data.dislike
                            )

                            if (image.likes >= image.dislikes) {
                                image.dateLastVote = new Date()
                            }
                        }

                        db.collection('images').update(
                            {
                                name: image.name
                            },
                            image,
                            {
                                upsert: true
                            }
                        )

                        updateMemoryImage(image)

                        res.jsonp({
                            status: 'ok',
                            image: image
                        })
                    })

                getImagesHourly(db)
            })
        })
        .catch(function(e) {
            // startup error

            console.log('mongo error', e.message)
            console.log('did you?:\nmongod --config /usr/local/etc/mongod.conf')
            throw e
        })
})()
