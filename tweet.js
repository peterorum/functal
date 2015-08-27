(function() {
  "use strict";

  // tweet & delete oldest file
  // download it from s3 & delete it

  // var fsq = require('./fsq');
  var s3 = require('./s3client');
  var twit = require('./tweet-media');

  var promise = require("bluebird");
  var mongodb = promise.promisifyAll(require("mongodb"));
  var mongoClient = promise.promisifyAll(mongodb.MongoClient);

  var msg = '#fractal #functal #digitalart iPhone app https://bit.ly/dailyfunctal';

  var bucket = 'functal-images';
  // var bucketJson = 'functal-json';

  mongoClient.connectAsync(process.env.mongo_functal).then(function(client) {

    var db = client.db('functal');

    s3.list('functal-images').then(function(result) {
      if (result.count === 0) {
        console.log('No files');
      }
      else {
        var r = Math.floor(Math.random() * result.files.length);
        var key = result.files[r].Key;

        var tmpFile = '/tmp/tweet-' + key;

        console.log(key);

        s3.download(bucket, key, tmpFile).then(function() {

          // prefix msg with title if any
          db.collection('images').findOneAsync(
            {
              name: key
            }).then(function(image) {
            if (image && image.title) {
              msg = '"' + image.title + '" ' + msg;
            }

            twit.tweet(msg, tmpFile, function() {});

            client.close();
          });
        });
      }
    });
  });
}());
