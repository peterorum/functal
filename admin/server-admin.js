(
    function()
    {
        "use strict";

        // must always be running
        // nohup node server-admin&

        var express = require('express');

        var app = express();
        var bodyParser = require("body-parser");

        app.disable('view cache');
        app.set('json spaces', 4);
        app.use(bodyParser.urlencoded(
        {
            extended: true
        }));
        app.use(bodyParser.json());

        var http = require('http');
        var url = require('url');
        var path = require('path');
        var fs = require('fs');
        var R = require('ramda');

        var s3 = require('../s3client');

        var bucket = 'functal-images';
        var bucketJson = 'functal-json';

        http.createServer(app).listen(process.env.PORT || 8083);

        var handleError = function(res, errNo, err)
        {
            res.writeHead(errNo,
            {
                "Content-Type": "text/plain"
            });
            res.write(errNo + " " + err + "\n");
            res.end();
            return;
        };

        var htmlHead = function(res)
        {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(200);

            res.write('<html ng-app="functalApp" ng-controller="FunctalCtrl">\n');

            // head
            res.write('<head>\n');
            res.write('<title>Functal Admin ({{images.length}})</title>\n');
            res.write('<link rel="icon" type="image/png" href="/images/favicon.png" />\n');
            res.write('<link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css" rel="stylesheet" type="text/css" />\n');
            res.write('<link href="css/base.css" rel="stylesheet" type="text/css" />\n');
            res.write('</head>\n');
            // body
            res.write('<body>\n');
        };

        var htmlEnd = function(res)
        {

            res.write('<script src="//code.jquery.com/jquery-2.1.4.min.js"></script>\n');
            res.write('<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular.min.js"></script>\n');
            res.write('<script src="//cdnjs.cloudflare.com/ajax/libs/ramda/0.13.0/ramda.min.js"></script>\n');

            res.write('<script src="js/ng-infinite-scroll.min.js"></script>\n');

            res.write('<script src="app/app.js"></script>\n');
            res.write('<script src="controllers/functal.js"></script>\n');


            res.write('</body>\n');

            // end
            res.end('</html>\n');
        };

        // javascript files
        app.get(/\.js$/, function(req, res)
        {
            var uri = url.parse(req.url, true, false);
            var filename = path.join(process.cwd(), uri.pathname);

            fs.readFile(filename, "binary", function(err, file)
            {
                if (err)
                {
                    handleError(res, 404, "Not found " + err);
                }
                else
                {
                    res.setHeader("Content-Type", "application/javascript");
                    res.writeHead(200);
                    res.write(file, "binary");
                    res.end();
                }
            });
        });

        // css files
        app.get(/\.css$/, function(req, res)
        {
            var uri = url.parse(req.url, true, false);
            var filename = path.join(process.cwd(), uri.pathname);

            fs.readFile(filename, "binary", function(err, file)
            {
                if (err)
                {
                    handleError(res, 404, "Not found " + err);
                }
                else
                {
                    res.setHeader("Content-Type", "text/css");
                    res.writeHead(200);
                    res.write(file, "binary");
                    res.end();
                }
            });
        });

        // images
        app.get(/\.(png|jpg|ico)$/, function(req, res)
        {
            var uri = url.parse(req.url, true, false);
            var filename = path.join(process.cwd(), uri.pathname);

            console.log(filename);

            fs.readFile(filename, "binary", function(err, file)
            {
                if (err)
                {
                    handleError(res, 404, "Not found " + err);
                }
                else
                {
                    res.setHeader("Content-Type", "image/" + path.extname(filename).substr(1));
                    res.writeHead(200);
                    res.write(file, "binary");
                    res.end();
                }
            });
        });


        app.get('/', function(req, res)
        {
            htmlHead(res);

            // start container
            res.write('<div class="container ng-cloak" >\n');

            // heading
            res.write('<div class="row">\n');
            res.write('<div class="col-xs-12">\n');

            res.write('<h1 class="text-center">Functal Admin</h1>');
            res.write('<h2 class="text-center" ng-show="images" ng-bind="images.length + \' functals\'"></h2>');
            res.write('<h2 class="text-center" ng-show="!images">loading...</h2>');

            res.write('</div>\n');
            res.write('</div>\n');

            // content

            res.write('<div class="panel" ng-repeat="image in images | limitTo : showCount">\n');
            res.write('<div class="row">\n');
            res.write('<div class="col-xs-12 text-center">\n');
            res.write('<img class="img-responsive" ng-src="{{cdn}}{{image}}"/>\n');
            res.write('</div>\n');
            res.write('<div class="col-xs-12 text-center">\n');
            res.write('<button class="btn btn-danger btn-xl" ng-click="delete(image)">Delete</button>\n');
            res.write('</div>\n');
            res.write('</div>\n');
            res.write('</div>\n');

            res.write('<div infinite-scroll="showMore()" infinite-scroll-distance="3"></div>\n');

            // end container
            res.write('</div>\n');

            htmlEnd(res);
        });

        // get images on s3
        app.get('/getimages', function(req, res)
        {
            s3.list(bucket).then(function(result)
            {
                // console.log(result.files);

                var images = R.pluck('Key', result.files);
                images = R.reverse(images);

                res.json(
                {
                    images: images
                });

            });
        });

        // delete image on s3
        app.post('/delete', function(req, res)
        {
            var key = req.body.key;

            s3.delete(bucket, key)
                .then(function()
                {
                    return s3.delete(bucketJson, key.replace(/png$/, 'json'));
                })
                .then(function(result)
                {
                    res.json(result);
                });
        });

    }()
);
