(function() {
  "use strict";

  // delete databse images that do not have associated actual image

  var s3 = require('../functal/s3client');
  var promise = require("bluebird");
  var mongodb = promise.promisifyAll(require("mongodb"));
  var mongoClient = promise.promisifyAll(mongodb.MongoClient);

  mongoClient.connectAsync(process.env.mongo_functal).then(function(client) {

    var db = client.db('functal');

    var bucket = 'functal-images';

    console.log('get s3');

    s3.list(bucket).then(function(result) {

      console.log('got s3');

      if (result.count === 0) {
        console.log('No files');
      } else {

        console.log('s3 count', result.count);

        let keys = result.files.map(f => f.Key);

        console.log('keys count', keys.length);

        // process each db image
        // delete if not in s3 list

        let dbImages = db.collection('images');

        dbImages.find().toArray(function(err, docs)
        {
            console.log('db images', docs.length);

            let toDelete = [];

            docs.forEach((image) => {

              if (keys.indexOf(image.name) >= 0) {
                // found
              } else {
                // console.log('delete', image.name);
                toDelete.push(image.name);
              }
            });

            console.log('delete count', toDelete.length);

            dbImages.removeAsync({name: {$in: toDelete}}).then(() =>{
              console.log('deleted');
              db.close()
            });
        });

      }

    });
  });

}());
