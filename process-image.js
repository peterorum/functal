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
  // var Rp = require('./plus-fp/plus-fp');
  // var s3 = require('./s3client');

  var clr = require('./color');

  var path = require('path');
  var promise = require("bluebird");
  var fs = promise.promisifyAll(require('fs'));

  // smaller image, no tweet
  var isDev = /Apple_Terminal|iterm\.app/i.test(process.env.TERM_PROGRAM);

  var functalsFolder = 'functals';

  // save process file

  // ------------ output to a processing script

  var createProcess = function(folder, filename, data, inputWidth, inputHeight) {

    return new Promise(function(resolve) {

      filename = filename.replace(/-/, '');

      let filePath = `${folder}/${filename}`;

      if (!fs.existsSync(filePath)) {
        fs.mkdirAsync(filePath);
      }

      var pde = fs.createWriteStream(`${folder}/${filename}/${filename}.pde`);

      var outputWidth = 512
      var outputHeight = outputWidth;

      pde.write('void setup() {\n');
      pde.write('noLoop();\n');
      pde.write(`size(${outputWidth}, ${outputHeight});\n`);
      pde.write('smooth();\n');
      pde.write('background(0);\n');
      pde.write('noFill();\n');
      pde.write('}\n');

      // do points at random

      let xy = [];

      for (let y = 0; y < outputHeight; y++) {

        for (let x = 0; x < outputHeight; x++) {
          xy.push({
            x: x,
            y: y
          });
        }
      }

      xy = R.sortBy(() => math.random(), xy);

      // break into small functions to overcome java size limit - one per column
      pde.write('void draw() {\n');

      for (var z1 = 0; z1 < xy.length; z1 += outputWidth) {
        pde.write(`draw${z1}();\n`);
      }
      pde.write('}\n');

      for (let z1 = 0; z1 < xy.length; z1 += outputWidth) {
        pde.write(`void draw${z1}() {\n`);

        for (let z2 = 0; z2 < outputWidth; z2++) {
          let z = z1 + z2;

          let yy = xy[z].y;
          let xx = xy[z].x;

          let y = yy + inputHeight / 2 - outputHeight / 2;
          let x = xx + inputWidth / 2 - outputWidth / 2;
          var rgb = data[x][y].rgb;

          var hsl = clr.rgb2hsl(rgb);

          var radius = 64 * (1 - hsl.l);
          var strokeWeight = 1; //math.randomInt(1, 9);
          var opacity = 255 * (1 - hsl.l);

          pde.write(`strokeWeight(${strokeWeight});\n`);

          pde.write(`stroke(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity});\n`);

          pde.write(`ellipse(${xx}, ${yy}, ${radius}, ${radius});\n`);

        }
        pde.write('}\n');
      }

      pde.end(function() {
        resolve();
      });

    });
  };

  // process file

  var processFiles = function() {

    var size = (isDev ? 'small' : 'medium');

    let folder = `${functalsFolder}/${size}`;

    var files = fs.readdirSync(folder);

    R.forEach(function(f) {
      if (path.extname(f) === '.jpg') {
        console.log(f);

        var jpegData = fs.readFileSync(folder + '/' + f);

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
          // x = w - 1 - x;
          // y = h - 1 - y;

          data[y][x] = {
            rgb: rgb
          };
        }

        createProcess(folder, f.replace(/\.jpg/, ''), data, w, h);
      }
    }, files);


  };
  // kick off

  processFiles();

}());
