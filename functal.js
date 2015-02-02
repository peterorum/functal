(function()
{
    "use strict";

    var math = require('mathjs');
    var fs = require('fs');

    var PNG = require('node-png').PNG;

    var fp = require('lodash-fp');
    fp.mixin(require('./plus-fp/plus-fp'));

    var Twitter_update_with_media = require('./twitter_update_with_media');

    //------------ twitter
    var tweet = function(text)
    {
        var T = new Twit(
        {
            // jshint ignore:start
            consumer_key: 'cY0JxQ7nBPrUk73qVDxVnc0xy', //process.env.twitterConsumerKey,
            consumer_secret: 'FHSCngkvIhuH7SRO9J9JVZEWF5llsq6XKCa5mYLzmHukLLyrVq', // process.env.twitterConsumerSecret,
            access_token: '3007843982-vyu0FnX6aYbt9zQVZ2tSfifUkjEwp0tXwF7edAj', // process.env.twitterAccessToken,
            access_token_secret: '1KyHHQO12SZRS314dUUOwOxKBOtynwNGaoAzE8wa9fyvW' // process.env.twitterAccessTokenSecret
                // jshint ignore:end
        });

        T.post('statuses/update',
        {
            status: text
        }, function(err /*, data, response */ )
        {
            if (err)
            {
                console.log(err);
            }

            // console.log(data);
        });
    };

    //----------- fractal functions
    var ff = {};

    // convert to -1 .. 1
    ff.normalize = fp.curry(function(range, x)
    {
        return x / range * 2 - 1;
    });

    ff.escapeCount = fp.curry(function(f, x, y)
    {
        var count = 0;

        // start z at zero
        var z = math.complex(0, 0);

        // vary c by x & y
        var c = math.complex(x, y);

        var maxCount = f.maxCount;
        var limit = f.limit;

        // count how long the iteration takes to break the limit

        while (count < maxCount - 1)
        {
            z = math.chain(z)
                .pow(2)
                .add(c)
                .done();

            if (math.norm(z) > limit)
            {
                break;
            }

            count++;
        }

        return count;
    });

    // ---------- make a functal

    ff.make = fp.curry(function(options)
    {
        var f = {};

        f.width = options.width();
        f.height = options.height();
        f.maxCount = options.maxCount();
        f.limit = options.limit();

        var data = [];

        var startTime = (new Date()).getTime();

        fp.range(0, f.width).forEach(function(x)
        {
            data[x] = [];

            var fx = ff.normalize(f.width, x);

            fp.range(0, f.height).forEach(function(y)
            {
                var fy = ff.normalize(f.height, y);

                var count = ff.escapeCount(f, fx, fy);

                data[x][y] = count;
            });
        });

        f.time = ((new Date()).getTime() - startTime) / 1000;

        if (options.file())
        {
            ff.png(options.file(), f, data);
        }

        return f;
    });

    // ------------ output to a png image

    ff.png = fp.curry(function(filename, functal, data)
    {
        var image = new PNG(
        {
            width: functal.width,
            height: functal.height,
            filterType: -1
        });

        for (var y = 0; y < image.height; y++)
        {
            for (var x = 0; x < image.width; x++)
            {
                var idx = (image.width * y + x) << 2;

                var i = data[x][y];

                // grayscale

                image.data[idx] = i;
                image.data[idx + 1] = i;
                image.data[idx + 2] = i;
                image.data[idx + 3] = 0xff;
            }
        }

        image.pack().pipe(fs.createWriteStream(filename));

    });

    // ------------ init a functal

    var options = {
        width: function()
        {
            return 100;
        },
        height: function()
        {
            return 100;
        },
        maxCount: function()
        {
            return 256;
        },
        limit: function()
        {
            return 2;
        },
        file: function()
        {
            return 'functals/f000001.png';
        }
    };

    var functal = ff.make(options);

    console.log(functal.time + ' secs');

    if (process.env.consumer_key)
    {
        var tuwm = new Twitter_update_with_media(
        {
            consumer_key: process.env.consumer_key,
            consumer_secret: process.env.consumer_secret,
            token: process.env.token,
            token_secret: process.env.token_secret
        });

        tuwm.post('First functal', 'functals/f000001.png', function(err, response)
        {
            if (err)
            {
                console.log('error', err);
            }


            console.log(response.body);

            // if (response.body.errors)
            {
                console.log('try again');

                tuwm.post('First functal', 'functals/f000001.png', function(err, response)
                {
                    if (err)
                    {
                        console.log('error', err);
                    }

                    console.log(response.body);

                });
            }
        });


    }
}());
