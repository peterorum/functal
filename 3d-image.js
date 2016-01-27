(function() {

    "use strict";

    var seedrandom = require('seedrandom');
    var randomSeed = (new Date()).getTime();

    // must be first
    seedrandom(randomSeed, {
        global: true
    });

    var chalk = require('chalk');
    var math = require('mathjs');
    var jpeg = require('jpeg-js');
    var R = require('ramda');
    var Rp = require('./plus-fp/plus-fp');

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

    function num2hex(d) {
      return (d < 16 ? "0" : "") + d.toString(16);
    }


    // ------------ output to html+three.js

    var create3d = function(filename) {

        return new promise(function(resolve) {

            console.log(chalk.yellow(filename));

            var jpeg = loadJpeg(filename);

            let data = jpeg.data;
            let inputWidth = jpeg.width;
            let inputHeight = jpeg.height;

            var outputFilename = filename.replace(/\.jpg/, '.html');

            var outputWidth = inputWidth;
            var outputHeight = inputHeight;

            var maxz = Rp.bandomInt(outputHeight, 2);
            console.log('maxz ' , maxz);

            try {
                var outf = fs.createWriteStream(`${outputFilename}`);

                outf.write(`<!DOCTYPE html>
                <html lang='en'>
                <head>
                    <meta charset='UTF-8'>
                    <title>${outputFilename}</title>
                    <script src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r73/three.min.js'></script>
                </head>
                <body style='margin:0; padding:0'>\n`);

                // add line
                outf.write(`<script>
                function al(scene, x3, y3, z3, color) {
                  var geometry = new THREE.Geometry();

                  geometry.vertices.push(
                    new THREE.Vector3( x3, y3, 0 ),
                    new THREE.Vector3( x3, y3, z3 )
                  );

                  var material = new THREE.LineBasicMaterial({
                    color: color
                  });

                  var line = new THREE.Line( geometry, material );

                  scene.add(line);
                }
                </script>\n`);

                outf.write(`<script>
                  draw();

                  function draw() {

                      var width = ${outputWidth};
                      var height = ${outputHeight};

                      var s = new THREE.Scene();

                      var camera = new THREE.PerspectiveCamera( 75, width / height, 1, 1000 );
                      camera.position.z = 1000;
                \n`);

                let xy = [];

                for (let y = 0; y < outputHeight; y++) {

                    for (let x = 0; x < outputWidth; x++) {
                        xy.push({
                            x: x,
                            y: y
                        });
                    }
                }

                // use a small % of points otherwise too big to render
                xy = R.sortBy(() => math.random(), xy);
                xy = R.take(xy.length * 0.2, xy);

                for (let k = 0; k < xy.length; k++) {

                    let yy = xy[k].y;
                    let xx = xy[k].x;

                    let x = xx + inputWidth / 2 - outputWidth / 2;
                    let y = yy + inputHeight / 2 - outputHeight / 2;
                    let rgb = data[x][y].rgb;

                    let hsl = clr.rgb2hsl(rgb);

                    // 3d coords
                    let x3 = (x / inputWidth) * outputWidth - outputWidth / 2;
                    let y3 = - ((y / inputHeight) * outputHeight - outputHeight / 2);

                    let z3 = math.round(hsl.l * maxz, 0); /// outputHeight;

                    outf.write(`al(s, ${x3}, ${y3}, ${z3}, 0x${num2hex(rgb.r)}${num2hex(rgb.g)}${num2hex(rgb.b)});\n`);
                }

                // end

                outf.write(`
                  var renderer = new THREE.WebGLRenderer();
                  renderer.setSize( width, height );

                  document.body.appendChild( renderer.domElement );

                  renderer.render( s, camera );
                \n`);

                outf.write(`}
                      </script>
                  </body>
                  </html>
                  \n`);

                data = null;
                jpeg.data = null;
                jpeg = null;
                xy = null;

                outf.end(function() {
                    outf = null;
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

            promise.each(files, create3d).then(function() {});
        }
        else {
            console.log('usage: node 3d-image path ...');
        }


    };

    // kick off

    processFiles();

}());
