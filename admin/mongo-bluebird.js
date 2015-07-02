(
    function()
    {
        "use strict";

        var promise = require("bluebird");
        var mongodb = promise.promisifyAll(require("mongodb"));

        mongodb.connectAsync(process.env.mongo_functal).then(function(db)
        {
            var collection = db.collection('images');

            return collection.find().toArrayAsync().then(function(docs)
            {
                console.log(docs);

                db.close();
            });

        })
        .catch(function(e)
        {
            console.log(e.message);
            throw e;
        });

    }()
);
