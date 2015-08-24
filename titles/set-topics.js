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

  var setTopics = function(db) {
    return new Promise(function(resolve, reject) {

      db.collection('images').find({
        topic: {
          $exists: false
        }
      }).toArrayAsync().then(function(docs) {

        console.log('count: ' + docs.length);

        docs.reverse();

        var updates = R.map(function(image) {

          return new Promise(function(updateResolve, updateReject) {

            console.log(image.name);

            var jsonUrl = 'https://s3.amazonaws.com/functal-json/' + image.name.replace(/jpg/, 'json');

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
                topic = (math.random() < 0.5 ? 'grid' : 'spiral');
              }

              console.log(topic);

              image.topic = topic;

              db.collection('images').updateAsync({name: image.name}, image).then(function(){
                updateResolve();
              });
            }, function(err) {
              console.log('mongo error: ' + err);
              updateReject();
            });
          });
        }, R.take(1000, docs));

        promise.all(updates).then(function() {
          resolve();
        }, function(){reject();});
      });
    });

  };

  //--------- database

  mongoClient.connectAsync(process.env.mongo_functal).then(function(client) {

    var db = client.db('functal');

    setTopics(db).finally(function() {
      client.close();
    });

  });
}());
