(
    function()
    {
        "use strict";

        var express = require('express');
        var app = express();

        app.disable('view cache');
        app.set('json spaces', 4);

        var http = require('http');
        var url = require('url');
        var path = require('path');
        var fs = require('fs');
        var R = require('ramda');

        var s3 = require('../s3client');

        var bucket = 'functal-images';

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

            res.write('<html ng-app="functalApp">\n');

            // head
            res.write('<head>\n');
            res.write('<title>Functal Admin</title>\n');
            res.write('<link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css" rel="stylesheet" type="text/css" />\n');
            res.write('<link href="css/base.css" rel="stylesheet" type="text/css" />\n');

            res.write('</head>\n');

            // body
            res.write('<body>\n');
        };

        var htmlEnd = function(res)
        {
            res.write('<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular.min.js"></script>\n');

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


        app.get('/', function(req, res)
        {
            htmlHead(res);

            // start container
            res.write('<div class="container ng-cloak"  ng-controller="FunctalCtrl" >\n');

            // heading
            res.write('<div class="row">\n');
            res.write('<div class="col-xs-12">\n');

            res.write('<h1 class="text-center">Functals</h1>');

            res.write('</div>\n');
            res.write('</div>\n');

            // content

            res.write('<div class="panel row" ng-repeat="image in images">\n');
            res.write('<div class="col-xs-12 text-center">\n');
            res.write('<img class="img-responsive" ng-src="{{cdn}}{{image}}"/>\n');
            res.write('</div>\n');
            res.write('</div>\n');

            // end container
            res.write('</div>\n');

            htmlEnd(res);
        });

        // get images on s3
        app.get('/images', function(req, res)
        {
            s3.list(bucket).then(function(result)
            {
                var images = R.pluck('Key', result.files);

                res.json(
                {
                    images: images
                });

            });
        });

    }()
);
