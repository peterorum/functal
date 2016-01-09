(function() {

    "use strict";

    // from folder above functals/medium...
    // eg cd /data/functal
    // nohup node --harmony ~/functal/svg-image.js &

    // choosing a random selection of files
    // mv `ls | shuf | head -n 250` ../medium

    var seedrandom = require('seedrandom');
    var randomSeed = (new Date()).getTime();

    // must be first
    seedrandom(randomSeed, {
        global: true
    });

    var chalk = require('chalk');
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

    //------------- sorters

    let sorterRandom = function(xy) {

      let xy2 = R.sortBy(() => math.random(), xy);

      let points = 1 + Rp.bandomInt(xy.length, -2);

      // sparse
      xy2 = R.take(points, xy2);

      return xy2;
    }

    sorterRandom.title = "sorter-random";

    // dark ones drawn first

    let sorterLight = function(xy, data) {

      let xy2 = R.sortBy((p) => {

        let rgb = data[p.x][p.y].rgb;
        let hsl = clr.rgb2hsl(rgb);

        return hsl.l;

      }, xy);

      return xy2;
    }

    sorterLight.title = "sorter-light";

    let sorters = [sorterRandom, sorterLight];

    //------------- fillers

    let fillerNone = function() {

        return "none";
    }

    fillerNone.title = "filler-none";
    fillerNone.hasColor = false;

    let fillerColor = function(options) {

        return `rgba(${options.rgb.r}, ${options.rgb.g}, ${options.rgb.b}, ${options.opacity / 4})`;
    }

    fillerColor.title = "filler-color";
    fillerColor.hasColor = true;

    let fillers = [fillerNone, fillerColor];

    //------------- strokers

    let strokerNone = function() {

        return "none";
    }

    strokerNone.title = "stroker-none";

    let strokerColor = function(options) {

        return `rgba(${options.rgb.r}, ${options.rgb.g}, ${options.rgb.b}, ${options.opacity})`;
    }

    strokerColor.title = "stroker-color";

    let strokerBlack = function(options) {

        return `rgba(0, 0, 0, ${options.opacity})`;
    }

    strokerBlack.title = "stroker-black";

    let strokers = [strokerNone, strokerColor, strokerBlack];

    //------------- shapers

    // ellipse

    let shapeEllipse = function(svgf, options) {
        svgf.write(`<ellipse rx="${options.width}" ry="${options.height}" cx="${options.x}" cy="${options.y}" fill="${options.filler(options)}" stroke="${options.stroker(options)}" stroke-width="${options.strokeWidth}"  transform="rotate(${options.angle}, ${options.x + options.width / 2}, ${options.y + options.height / 2} )" />\n`);
    };

    shapeEllipse.isFilled = true;
    shapeEllipse.title = 'shaper-ellipse';

    // rect

    let shapeRect = function(svgf, options) {
        svgf.write(`<rect x="${options.x}" y="${options.y}" rx="${options.rounded}" ry="${options.rounded}" width="${options.width}" height="${options.height}" fill="${options.filler(options)}" stroke="${options.stroker(options)}" stroke-width="${options.strokeWidth}"  transform="rotate(${options.angle}, ${options.x + options.width / 2}, ${options.y + options.height / 2} )" />\n`);
    };

    shapeRect.isFilled = true;
    shapeRect.title = 'shaper-rect';

    // line
    // rotates by hue

    let shapeLine = function(svgf, options) {
        svgf.write(`<line x1="${options.x}" x2="${options.x + options.width}"  y1="${options.y}" y2="${options.y + options.height}" stroke="${options.stroker(options)}" stroke-width="${options.strokeWidth}" transform="rotate(${options.angle}, ${options.x + options.width / 2}, ${options.y + options.height / 2} )" />\n`);
    };

    shapeLine.isFilled = false;
    shapeLine.title = 'shaper-line';

    let shapers = [shapeEllipse, shapeRect, shapeLine];

    // ------------ output to svg

    var createSvg = function(filename) {

        return new promise(function(resolve) {

            console.log(chalk.yellow(filename));

            var jpeg = loadJpeg(filename);

            let data = jpeg.data;
            let inputWidth = jpeg.width;
            let inputHeight = jpeg.height;

            var outputFilename = filename.replace(/\.jpg/, '');

            var outputWidth = inputWidth;
            var outputHeight = inputHeight;

            let maxStrokeWidth = 1 + Rp.bandomInt(outputWidth, 5);
            let maxWidth = 1 + Rp.bandomInt(64, -2);
            let maxHeight = 1 + Rp.bandomInt(64, -2);
            let rounded = Rp.bandomInt(math.min(maxWidth, maxHeight) / 8, 1);

            console.log(chalk.green(`maxStrokeWidth: ${maxStrokeWidth}`));
            console.log(chalk.green(`max size: ${maxWidth} x ${maxHeight}`));

            // set functions
            var shaper = Rp.wandom(shapers);
            var filler = Rp.wandom(fillers);

            // if no filler, ensure stroker has color
            var stroker;

            if (!filler.hasColor || ! shaper.isFilled) {
                stroker = strokerColor;
            }
            else {
                stroker = Rp.wandom(strokers);
            }

            var sorter = Rp.wandom(sorters);

            console.log(chalk.blue(shaper.title));
            console.log(chalk.blue(filler.title));
            console.log(chalk.blue(stroker.title));
            console.log(chalk.blue(sorter.title));

            try {
                var svgf = fs.createWriteStream(`${outputFilename}.svg`);

                svgf.write('<?xml version="1.0"?>\n');
                svgf.write('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">\n');
                svgf.write(`<svg width="${outputWidth}" height="${outputHeight}" xmlns="http://www.w3.org/2000/svg"> \n`);

                svgf.write(`<title>${filename}</title>\n`);

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

                xy = sorter(xy, data);

                for (let z = 0; z < xy.length; z++) {

                    let yy = xy[z].y;
                    let xx = xy[z].x;

                    let y = yy + inputHeight / 2 - outputHeight / 2;
                    let x = xx + inputWidth / 2 - outputWidth / 2;
                    let rgb = data[x][y].rgb;

                    let hsl = clr.rgb2hsl(rgb);

                    let width = math.round(maxWidth * (1 - hsl.l), 0);
                    let height = math.round(maxHeight * (1 - hsl.l), 0);

                    let strokeWidth = math.randomInt(1, maxStrokeWidth + 1);

                    let opacity = math.round((1 - hsl.l) / strokeWidth, 2);

                    let angle = 360 * hsl.h;

                    let options = {
                        strokeWidth: strokeWidth,
                        x: xx,
                        y: yy,
                        width: width,
                        height: height,
                        rgb: rgb,
                        opacity: opacity,
                        filler: filler,
                        stroker: stroker,
                        angle: angle,
                        rounded: rounded
                    };

                    shaper(svgf, options);
                }

                // end
                svgf.write('</svg>\n');

                data = null;
                jpeg.data = null;
                jpeg = null;
                xy = null;

                svgf.end(function() {
                    svgf = null;
                    resolve();
                });
            } catch (ex) {
                console.log(chalk.red('error'), ex);

                resolve();
            }

        });
    };

    // process file

    var processFiles = function() {

        if (process.argv.length > 2) {

            var files = R.tail(R.tail(process.argv));

            files = R.filter((f) => path.extname(f) === '.jpg', files);

            // console.log(files);

            promise.each(files, createSvg).then(function() {
            });
        }
        else {
            console.log('usage: node --harmony svg-image path ...');
        }


    };

    // kick off

    processFiles();

}());
