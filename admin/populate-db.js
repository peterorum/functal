(function() {
  "use strict";

  // add each image on s3 to db

  var R = require('ramda');

  var s3 = require('../s3client');

  var promise = require("bluebird");
  var mongodb = promise.promisifyAll(require("mongodb"));
  var mongoClient = promise.promisifyAll(mongodb.MongoClient);

  var bucket = 'functal-images';

  //---------- get images on s3

  var getImageList = function(db) {
    return new Promise(function(resolve, reject) {
      console.log('load list from s3', (new Date()).toString());

      s3.list(bucket).then(function(result) {

        console.log('count: ' + result.files.length);

        var adds = R.map(function(f) {

          return new Promise(function(addResolve) {
            var key = f.Key;

            db.collection('images').findOneAsync(
              {
                name: key
              }).then(function(image) {

              if (!image) {
                console.log(key + ' add');

                image = {
                  name: key,
                  likes: 0,
                  dislikes: 0,
                  dateLastVote: new Date()
                };

                db.collection('images').updateAsync(
                  {
                    name: image.name
                  },
                  image,
                  {
                    upsert: true
                  }).then(function() {
                  addResolve();
                });
              }
              else {
                console.log(key + ' found');
                addResolve();
              }
            });
          });
        }, result.files);

        promise.all(adds).then(function() {
          console.log('all done');
          resolve();
        });

      },
        function(err) {
          console.log('error in getImageList', err);
          reject('error in getImageList');
        });
    });
  };

  //--------- database

  mongoClient.connectAsync(process.env.mongo_functal).then(function(client) {
    //------- db functions

    var db = client.db('functal');

    getImageList(db).then(function() {
      console.log('close');
      client.close();
    });

  });
}());
