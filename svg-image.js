(function() {

    "use strict";

    var seedrandom = require('seedrandom');
    var randomSeed = (new Date()).getTime();

    // must be first
    seedrandom(randomSeed, {
        global: true
    });

    var math = require('mathjs');
    // var moment = require('moment');
    var jpeg = require('jpeg-js');
    var R = require('ramda');
    var Rp = require('./plus-fp/plus-fp');
    // var s3 = require('./s3client');

    var clr = require('./color');

    var path = require('path');
    var promise = require("bluebird");
    var fs = promise.promisifyAll(require('fs'));

    // smaller image, no tweet
    var isDev = /Apple_Terminal|iterm\.app/i.test(process.env.TERM_PROGRAM);

    var functalsFolder = 'functals';

    // load jpeg

    function loadJpeg(filename) {

        var jpegData = fs.readFileSync(filename);

        var rawImageData = jpeg.decode(jpegData);

        var data = R.times(() => [], rawImageData.height);

        var rawData = rawImageData.data;
        var w = rawImageData.width;
        var h = rawImageData.height;

        for (var d = 0; d < rawImageData.width * rawImageData.height * 4; d += 4) {
            let rgb = {};

            rgb.r = rawData[d];
            rgb.g = rawData[d + 1];
            rgb.b = rawData[d + 2];

            let d1 = d / 4;

            let x = math.floor(d1 / w);
            let y = d1 - x * w;

            data[y][x] = {
                rgb: rgb
            };
        }

        return {
            data: data,
            width: w,
            height: h
        };
    }
    // ------------ output to svg

    var createSvg = function(filename) {

        console.log(filename);

        var jpeg = loadJpeg(filename);

        let data = jpeg.data;
        let inputWidth = jpeg.width;
        let inputHeight = jpeg.height;

        var outputFilename = filename.replace(/\.jpg/, '');

        var outputWidth = inputWidth;
        var outputHeight = inputHeight;

        let maxStrokeWidth = 1 + Rp.bandomInt(outputWidth, 5);

        console.log('maxStrokeWidth ', maxStrokeWidth);

        return new promise(function(resolve) {

            var svg = fs.createWriteStream(`${outputFilename}.svg`);

            svg.write('<?xml version="1.0"?>\n');
            svg.write('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">\n');
            svg.write(`<svg width="${outputWidth}" height="${outputHeight}" xmlns="http://www.w3.org/2000/svg"> \n`);

            svg.write(`<title>${filename}</title>\n`);

            // styles

            svg.write('<style type="text/css">\n');

            svg.write('.uf {fill: none }\n');

            for (let i = 1; i < maxStrokeWidth + 1; i++) {
                svg.write(`.st${i} {stroke-width: ${i}; }\n`);
            }

            svg.write('</style>\n');

            // do points at random

            let xy = [];

            for (let y = 0; y < outputHeight; y++) {

                for (let x = 0; x < outputWidth; x++) {
                    xy.push({
                        x: x,
                        y: y
                    });
                }
            }

            xy = R.sortBy(() => math.random(), xy);

            for (let z = 0; z < xy.length; z++) {

                let yy = xy[z].y;
                let xx = xy[z].x;

                let y = yy + inputHeight / 2 - outputHeight / 2;
                let x = xx + inputWidth / 2 - outputWidth / 2;
                let rgb = data[x][y].rgb;

                let hsl = clr.rgb2hsl(rgb);

                let radius = math.round(64 * (1 - hsl.l), 0);
                let strokeWidth = math.randomInt(1, maxStrokeWidth + 1);

                let opacity = math.round((1 - hsl.l) / strokeWidth, 2);

                svg.write(`<circle class="uf st${strokeWidth}"  r="${radius}" cx="${xx}" cy="${yy}" stroke="rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})"/>\n`);
            }

            // end
            svg.write('</svg>\n');

            data = null;
            jpeg.data = null;
            jpeg = null;
            xy = null;

            svg.end(function() {
                svg = null;
                resolve();
            });

        });
    };

    // process file

    var processFiles = function() {

        var size = (isDev ? 'small' : 'medium');

        let folder = `${functalsFolder}/${size}`;

        var files = fs.readdirSync(folder);

        files = R.filter((f) => path.extname(f) === '.jpg', files);

        files = R.map((f) => folder + '/' + f, files);

        promise.each(files, createSvg);

    };

    // kick off

    processFiles();

}());
