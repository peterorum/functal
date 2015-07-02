(
    function()
    {
        "use strict";

        var mongodb = require('mongodb');

        var MongoClient = mongodb.MongoClient;

        MongoClient.connect(process.env.mongo_functal,
        {
            db:
            {
                w: 1,
                native_parser: false
            },
            server:
            {
                poolSize: 5,
                socketOptions:
                {
                    connectTimeoutMS: 500
                },
                auto_reconnect: true
            },
            replSet:
            {},
            mongos:
            {}
        }, function(err, db)
        {
            if (err)
            {
                console.log("Connection failed", err);
            }
            else
            {
                db.listCollections().toArray(function(err, items)
                {
                    console.log(items);

                    var images = db.collection('images');

                    images.find().toArray(function(err, docs)
                    {
                        console.log(docs);

                        db.close();
                    });

                });
            }
        });

    }()
);
