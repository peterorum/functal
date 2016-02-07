(function() {

    "use strict";

    // check image has sufficient variety

    var chalk = require('chalk');
    var jpeg = require('jpeg-js');
    var R = require('ramda');

    var clr = require('./color');
    var pal = require('./palette');

    var path = require('path');
    var promise = require("bluebird");
    var fs = promise.promisifyAll(require('fs'));

    // load jpeg

    function loadJpeg(filename) {

        var jpegData = fs.readFileSync(filename);

        var rawImageData = jpeg.decode(jpegData);

        var rawData = rawImageData.data;
        var w = rawImageData.width;
        var h = rawImageData.height;

        let hsls = [];

        for (var d = 0; d < w * h * 4; d += 4) {
            let rgb = {};

            rgb.r = rawData[d];
            rgb.g = rawData[d + 1];
            rgb.b = rawData[d + 2];

            let hsl = clr.rgb2hsl(rgb);
            hsl.i = pal.getIntensity(hsl);

            hsls.push(hsl);
        }

        return hsls;
    }

    // ------------ process jpeg

    function check(filename) {

        return new promise(function(resolve) {

            console.log(chalk.yellow(filename));

            let hsls = loadJpeg(filename);

            console.log(chalk.yellow('calc stats'));

            let stats = pal.calcHslStats(hsls);

            console.log(JSON.stringify(stats, null, 2));

            let ok =
              stats.l.mean >0.25 &&
              stats.l.mean < 0.9 &&
              stats.l.std > 0.3 &&
              stats.s.mean > 0.17
              ;

            console.log('ok ' , ok);

            resolve(ok);
        });
    }

    // process file

    var processFile = function() {

        if (process.argv.length === 3) {

            var file = process.argv[2];

            if (path.extname(file) === '.jpg') {

               check(file).then(function(ok){
                  process.exit(1); ///ok ? 0 : 1);
               });
          }
        }
        else {
            console.log('usage: node check-image file.jpg');
        }


    };

    // kick off

    processFile();

}());
