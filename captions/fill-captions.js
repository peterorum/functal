"use strict";

let getCaption = require('./set-captions').getCaption;

// add a caption to each image without one

let promise = require("bluebird");
let mongodb = promise.promisifyAll(require("mongodb"));
let mongoClient = promise.promisifyAll(mongodb.MongoClient);

let setCaptions = function(db) {
  return new Promise(function(resolve, reject) {

    // no caption

    let query = {
      $or: [{
        caption: {
          $exists: false
        }
      },
        {
          caption: {
            $eq: ''
          }
        }
      ]
    };

    db.collection('images').find(query).toArrayAsync().then(function(docs) {

      docs.reverse();

      console.log('full count: ' + docs.length);

      // vision api limit
      // docs = docs.slice(0, 5000);
      // let delay = 3000;
      // console.log('limit count: ' + docs.length);

      // full blast
      // 10 per second = 100ms
      let delay = 100;

      let counter = 0;

      let updates = docs.map(function(image) {

        return new Promise(function(updateResolve) {
          counter++;
          setTimeout(function() {

            let imageUrl = `https://d1aienjtp63qx3.cloudfront.net/${image.name}`;

            console.log(imageUrl);

            getCaption(imageUrl).then(caption => {

              if (caption) {
                console.log(caption);

                image.caption = caption;

                db.collection('images').updateAsync(
                  {
                    name: image.name
                  }, image).then(function() {
                  updateResolve();
                });
              } else {
                console.log('no caption');
                updateResolve();

              }
            });

          // shedule the delay
          }, counter * delay);
        });
      });

      promise.all(updates).then(function() {
        console.log('all done');
        resolve();
      }).catch(function() {
        reject();
      });
    });
  });
};

//--------- database

mongoClient.connectAsync(process.env.mongo_functal).then(function(client) {


  let db = client.db('functal');

  setCaptions(db).then(function() {
    client.close();
  }).catch(function() {
    client.close();
  });

});
