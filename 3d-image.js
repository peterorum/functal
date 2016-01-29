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

    var isDev = /Apple_Terminal|iterm\.app/i.test(process.env.TERM_PROGRAM);

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

            let outputFilename = filename.replace(/\.jpg/, '.html');

            let outputWidth = inputWidth;
            let outputHeight = inputHeight;

            let maxz = 100 + Rp.bandomInt(outputHeight - 100, 3);
            console.log('maxz ', maxz);

            let maxRadius = 10 + Rp.bandomInt(128 - 10, 2);
            console.log('maxRadius ' , maxRadius);

            try {
                var outf = fs.createWriteStream(`${outputFilename}`);

                outf.write(`<!DOCTYPE html>
                <html lang='en'>
                <head>
                    <meta charset='UTF-8'>
                    <title>${outputFilename}</title>
                    <script src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r73/three.min.js'></script>
                </head>
                <body style='margin:0; padding:0; overflow: hidden'>\n`);

                // add line
                outf.write(`<script>
                function ln(scene, x3, y3, z3, color) {
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

                // add cylinder
                // todo: open/closed ends. vary radius.

                outf.write(`<script>
                function cyl(scene, options) {
                  var geometry = new THREE.CylinderGeometry(options.radius, options.radius, options.z, 64);
                  var material = new THREE.MeshPhongMaterial( {color: options.color} );

                  var cylinder = new THREE.Mesh( geometry, material );

                  cylinder.position.x = options.x;
                  cylinder.position.y = options.y;
                  cylinder.position.z = 0;



                  scene.add(cylinder);
                }
                </script>\n`);

                outf.write(`<script>
                  draw();

                  function draw() {

                      var width = ${outputWidth};
                      var height = ${outputHeight};

                      var scene = new THREE.Scene();
                      var s = scene;
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

                // 0.4 for lines

                let sample = (isDev ? 1 : 1);

                sample = sample / (maxRadius * maxRadius);

                xy = R.sortBy(() => math.random(), xy);
                xy = R.take(xy.length * sample, xy);

                for (let k = 0; k < xy.length; k++) {

                    let yy = xy[k].y;
                    let xx = xy[k].x;

                    let x = xx + inputWidth / 2 - outputWidth / 2;
                    let y = yy + inputHeight / 2 - outputHeight / 2;
                    let rgb = data[x][y].rgb;

                    let hsl = clr.rgb2hsl(rgb);

                    // 3d coords
                    let x3 = (x / inputWidth) * outputWidth - outputWidth / 2;
                    let y3 = -((y / inputHeight) * outputHeight - outputHeight / 2);

                    let z3 = math.round(hsl.l * maxz, 0); /// outputHeight;

                    let radius = maxRadius;

                    outf.write(`cyl(s, {
                      x: ${x3},
                      y: ${y3},
                      z: ${z3},
                      color: 0x${num2hex(rgb.r)}${num2hex(rgb.g)}${num2hex(rgb.b)},
                      radius: ${radius}
                    });
                    \n`);
                }

                // end

                let backgroundColor = '0x000000';


                outf.write(`
                  var renderer = new THREE.WebGLRenderer();

                  var camera = new THREE.PerspectiveCamera( 75, width / height, 0.1, 1000 );

                  camera.position.x = ${Rp.bandomInt(outputWidth / 2, 2) * Rp.randomSign()};
                  camera.position.y = ${Rp.bandomInt(outputHeight / 2, 2) * Rp.randomSign()};
                  camera.position.z = ${ Rp.bandomInt(1000, -2)};

                  camera.lookAt(s.position);

                  var spotLight = new THREE.SpotLight(0xffffff);
                  spotLight.position.set(${Rp.bandomInt(outputWidth / 2, 2) * Rp.randomSign()}, ${Rp.bandomInt(outputHeight / 2, 2) * Rp.randomSign()}, ${ Rp.bandomInt(1000, -2)});
                  spotLight.castShadow = true;
                  scene.add(spotLight);

                  renderer.setClearColor(new THREE.Color(${backgroundColor}));

                  renderer.setSize( width, height );

                  renderer.shadowMapEnabled = true;

                  document.body.appendChild( renderer.domElement );

                  renderer.render( scene, camera );
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
