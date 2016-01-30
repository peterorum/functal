(function() {
    "use strict";

    // add each image on s3 to db

    var R = require('ramda');
    var math = require('mathjs');

    var promise = require("bluebird");
    var mongodb = promise.promisifyAll(require("mongodb"));
    var mongoClient = promise.promisifyAll(mongodb.MongoClient);

    var request = promise.promisifyAll(require('request'));

    var modifiers = require('../modifiers');

    var setTopics = function(db, untitled) {
        return new Promise(function(resolve, reject) {

            var query = {}; // all

            // no topic

            if (untitled) {
                query = {
                    $or: [{
                        topic: {
                            $exists: false
                        }
                    },
                        {
                            topic: {
                                $eq: ''
                            }
                        }
                    ]
                };
            }

            db.collection('images').find(query).toArrayAsync().then(function(docs) {

                console.log('count: ' + docs.length);

                docs.reverse();

                var delay = 500;
                var counter = 0;

                var updates = R.map(function(image) {

                    return new Promise(function(updateResolve) {
                        counter++;
                        setTimeout(function() {

                            var jsonUrl = 'https://s3.amazonaws.com/functal-json/' + image.name.replace(/jpg/, 'json').replace(/(-svg|-3d*)\./, '.');

                            // jsonUrl = 'https://s3.amazonaws.com/functal-json/functal-20150704155915238.json';

                            // console.log(jsonUrl);

                            request.getAsync(jsonUrl).then(function(data) {
                                var response = data[0];
                                var topic;

                                if (response.statusCode === 200) {
                                    // json found
                                    var json = response.body;

                                    var functal = JSON.parse(json);

                                    functal.hslStats = functal.palette.hslStats;

                                    topic = modifiers.getTopic(functal);
                                }

                                if (!topic) {
                                    topic = modifiers.genericTopics[math.randomInt(0, modifiers.genericTopics.length)];
                                }

                                console.log(image.name + ': ' + topic);

                                image.topic = topic;

                                db.collection('images').updateAsync({
                                    name: image.name
                                }, image).then(function() {
                                    updateResolve();
                                });
                            }, function(err) {
                                console.log('http request error: ' + err);
                                updateResolve();
                            });
                        // shedule the delay
                        }, counter * delay);
                    });
                }, docs);

                promise.all(updates).then(function() {
                    resolve();
                }).catch(function() {
                    reject();
                });
            });
        });
    };

    //--------- database

    mongoClient.connectAsync(process.env.mongo_functal).then(function(client) {

        let untitled = !!R.find((a) => a === '--untitled', process.argv);

        var db = client.db('functal');

        setTopics(db, untitled).then(function() {
            client.close();
        }).catch(function() {
            client.close();
        });

    });
}());
