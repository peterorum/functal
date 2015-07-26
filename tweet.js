(function() {
  "use strict";

  // tweet & delete oldest file
  // download it from s3 & delete it

  var fsq = require('./fsq');
  var s3 = require('./s3client');
  var twit = require('./tweet-media');

  var msg = '#fractal #functal #digitalart iPhone app https://bit.ly/dailyfunctal';

  var bucket = 'functal-images';
  var bucketJson = 'functal-json';

  s3.list('functal-images').then(function(result) {
    if (result.count === 0) {
      console.log('No files');
    }
    else {
      var r = Math.floor(Math.random() * result.files.length);
      var key = result.files[r].Key;

      var tmpFile = '/tmp/tweet-' + key;

      s3.download(bucket, key, tmpFile).then(function() {
        twit.tweet(msg, tmpFile, function() {
          // delete image
          // s3.delete(bucket, key)
          //     .then(function()
          //     {
          //         // delete json
          //         return s3.delete(bucketJson, key.replace(/(png|jpg)$/, 'json'));
          //     })
          //     .then(function()
          //     {
          //         // delete local file
          //         return fsq.unlink(tmpFile);
          //     })
          //     .done();
        });
      });
    }
  });
}());
