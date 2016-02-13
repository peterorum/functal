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
        var len = w * h * 4;

        for (var d = 0; d < len; d += 4) {
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

    function randomColor(params, maxLightness ) {
        let k = math.randomInt(params.xy.length);
        let yy = params.xy[k].y;
        let xx = params.xy[k].x;

        let x = xx + params.dimensions.inputWidth / 2 - params.dimensions.outputWidth / 2;
        let y = yy + params.dimensions.inputHeight / 2 - params.dimensions.outputHeight / 2;
        let rgb = params.data[x][y].rgb;

        let color = `0x${num2hex(math.floor(rgb.r * maxLightness))}${num2hex(math.floor(rgb.g * maxLightness))}${num2hex(math.floor(rgb.b * maxLightness))}`;

        return color;
    }

    //------------- shapes

    let shapeLine = {
        fn: "ln",
        sample: () => (isDev ? 0.02 : 0.4)
    };

    let shapeCylinder = {
        fn: "cyl",
        sample: (params) =>  (isDev ? 1
         : 1) / math.square(Math.max(params.maxRadius, params.maxRadius2))
    };

    let shapePlane = {
        fn: "pl",
        sample: (params) =>  (isDev ? 1
         : 1) / params.maxRadius / 8
    };

    let shapes = [
        {
            shape: shapeLine,
            weight: 100
        },
        {
            shape: shapeCylinder,
            weight: 400
        },
        {
            shape: shapePlane,
            weight: 100
        }
    ];

    //------------- material

    function phongMaterial() {

      return `
        var materials = [
          new THREE.MeshPhongMaterial( {
            color: options.color,
            opacity: options.opacity,
            transparent: true,
            shininess: options.shininess,
            side: THREE.DoubleSide,
            specular: options.specular
          } )
        ];
      `;
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

            let dimensions = {
                inputWidth,
                inputHeight,
                outputWidth,
                outputHeight
            };

            let maxz = 100 + Rp.bandomInt(outputHeight - 100, 3);

            let maxRadius = 1 + Rp.bandomInt(128, 2);
            let maxRadius2 = (maxRadius < 10 ? 10 + Rp.bandomInt(128, 2) : (math.random() < 0.5 ? maxRadius : 1 + Rp.bandomInt(128, 2)));

            let maxShininess = math.randomInt(0, 256);

            let spotLights = Rp.bandomInt(4, 1);
            let pointLights = (spotLights === 0 ? 1 : 0) + Rp.bandomInt(4, 1);
            let directionalLights = (spotLights  + pointLights === 0 ? 1 : 0) + Rp.bandomInt(4, 1);

            let segments = math.randomInt(1, 65);

            let wireframe = (maxRadius > 12) && (math.random() < 0.25);
            let wireframeLinewidth = 1 + Rp.bandomInt(100, 3);

            let minOpacity = math.round(100 * math.random()) / 100;
            let maxOpacity = 1;

            if (wireframe) {
                maxOpacity = math.round(100 * math.random(minOpacity, 1)) / 100;
            }

            let openEnded = (math.random() < 0.5);

            let arc = (math.random() < 0.75) ? 2 * Math.PI : math.round(100 * math.random(0, 2 * Math.PI)) / 100;

            let rotation = {
                x: math.random(0, 2 * Math.PI),
                y: math.random(0, 2 * Math.PI),
                z: math.random(0, 2 * Math.PI)
            };

            let fieldOfView = 60 + Rp.bandom(30, 2);

            let shape = Rp.wandom(shapes).shape;

            let params = {
                randomSeed,
                maxz,
                maxRadius,
                maxRadius2,
                maxShininess,
                spotLights,
                pointLights,
                directionalLights,
                segments,
                wireframe,
                wireframeLinewidth,
                minOpacity,
                maxOpacity,
                openEnded,
                arc,
                rotation,
                fieldOfView,
                shape
            };

            console.log('params ', JSON.stringify(params, null, 2));

            params.dimensions = dimensions;

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

                outf.write(`<script>\n`);

                // add line
                outf.write(`
                function ln(scene, options) {
                  var geometry = new THREE.Geometry();

                  geometry.vertices.push(
                    new THREE.Vector3( options.x, options.y, 0 ),
                    new THREE.Vector3( options.x, options.y, options.z )
                  );

                  var material = new THREE.LineBasicMaterial({
                    color: options.color
                  });

                  var line = new THREE.Line( geometry, material );

                  scene.add(line);
                }
                \n`);

                // add cylinder

                outf.write(`
                function cyl(scene, options) {

                  var geometry = new THREE.CylinderGeometry(options.radius, options.radius2, options.z, ${params.segments}, 1, ${params.openEnded}, 0, ${params.arc});

                  ${phongMaterial()}

                \n`);

                if (params.wireframe) {
                    outf.write(`
                    materials.push(

                      new THREE.MeshBasicMaterial( {
                        color: options.color,
                        wireframe: true,
                        wireframeLinewidth: options.wireframeLinewidth
                      } )

                    );
                  \n`);
                }

                outf.write(`
                  var cylinder = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  cylinder.rotation.x = ${params.rotation.x};
                  cylinder.rotation.y = ${params.rotation.y};
                  cylinder.rotation.z = ${params.rotation.z};

                  cylinder.position.x = options.x;
                  cylinder.position.y = options.y;
                  cylinder.position.z = options.z / 2;

                  scene.add(cylinder);
                }
                \n`);


                // add plane

                outf.write(`
                function pl(scene, options) {

                  var geometry = new THREE.PlaneGeometry(options.radius, options.z, 2, 8);

                  ${phongMaterial()}

                \n`);

                if (params.wireframe) {
                    outf.write(`
                    materials.push(

                      new THREE.MeshBasicMaterial( {
                        color: options.color,
                        wireframe: true,
                        wireframeLinewidth: options.wireframeLinewidth
                      } )

                    );
                  \n`);
                }

                outf.write(`
                  var plane = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  plane.rotation.x = ${Math.PI / 2};

                  plane.position.x = options.x;
                  plane.position.y = options.y;
                  plane.position.z = 0;

                  scene.add(plane);
                }
                \n`);



                outf.write(`
                  draw();

                  function draw() {

                      var width = ${dimensions.outputWidth};
                      var height = ${dimensions.outputHeight};

                      var scene = new THREE.Scene();
                      var s = scene;
                \n`);

                let xy = [];

                for (let y = 0; y < dimensions.outputHeight; y++) {

                    for (let x = 0; x < dimensions.outputWidth; x++) {
                        xy.push({
                            x: x,
                            y: y
                        });
                    }
                }

                xy = R.sortBy(() => math.random(), xy);
                let sample = shape.sample(params);
                xy = R.take(xy.length * sample, xy);

                params.xy = xy;
                params.data = data;


                for (let k = 0; k < xy.length; k++) {

                    let yy = xy[k].y;
                    let xx = xy[k].x;

                    let x = xx + dimensions.inputWidth / 2 - dimensions.outputWidth / 2;
                    let y = yy + dimensions.inputHeight / 2 - dimensions.outputHeight / 2;
                    let rgb = data[x][y].rgb;

                    let hsl = clr.rgb2hsl(rgb);

                    // 3d coords
                    let x3 = (x / dimensions.inputWidth) * dimensions.outputWidth - dimensions.outputWidth / 2;
                    let y3 = -((y / dimensions.inputHeight) * dimensions.outputHeight - dimensions.outputHeight / 2);

                    let z3 = math.round(hsl.l * maxz, 0);

                    let radius = params.maxRadius;
                    let radius2 = params.maxRadius2;

                    let opacity = params.minOpacity + (params.maxOpacity - params.minOpacity) * hsl.l;

                    let shininess = params.maxShininess;

                    let specular = randomColor(params, 1);

                    outf.write(`${shape.fn}(s, {
                      x: ${x3},
                      y: ${y3},
                      z: ${z3},
                      color: 0x${num2hex(rgb.r)}${num2hex(rgb.g)}${num2hex(rgb.b)},
                      radius: ${radius},
                      radius2: ${radius2},
                      opacity: ${opacity},
                      shininess: ${shininess},
                      specular: ${specular}
                    });
                    \n`);
                }

                // end

                let backgroundColor = '0x000000';

                params.ambientLight = randomColor(params, 0.5);
                console.log('params.ambientLight ', params.ambientLight);

                let cameraPositionZ = 1000;

                // camera
                outf.write(`
                  var renderer = new THREE.WebGLRenderer();

                  var camera = new THREE.PerspectiveCamera( ${params.fieldOfView}, width / height, 0.1, 1000 );

                  camera.position.x = ${Rp.bandomInt(dimensions.outputWidth / 2, 2) * Rp.randomSign()};
                  camera.position.y = ${Rp.bandomInt(dimensions.outputHeight / 2, 2) * Rp.randomSign()};
                  camera.position.z = ${cameraPositionZ};

                  camera.lookAt(scene.position);
                  \n`);

                // spotlights

                for (let i = 0; i < spotLights; i++) {

                    let spotLightColor = randomColor(params, 0.33);
                    console.log(`spotLightColor${i} `, spotLightColor);

                    outf.write(`
                  var spotLight${i} = new THREE.SpotLight(${spotLightColor});
                  spotLight${i}.position.set(${Rp.bandomInt(dimensions.outputWidth / 2, 2) * Rp.randomSign()}, ${Rp.bandomInt(dimensions.outputHeight / 2, 2) * Rp.randomSign()}, ${ Rp.bandomInt(1000, -2)});
                  spotLight${i}.angle = ${math.random(Math.PI)};
                  spotLight${i}.distance = ${Rp.bandom(1000, -3)};
                  spotLight${i}.exponent = ${math.random(20)};
                  scene.add(spotLight${i});
                  \n`);
                }

                // pointlights

                for (let i = 0; i < pointLights; i++) {

                    let pointLightColor = randomColor(params, 0.33);
                    console.log(`pointLightColor${i} `, pointLightColor);

                    outf.write(`
                  var pointLight${i} = new THREE.PointLight(${pointLightColor});
                  pointLight${i}.position.set(${Rp.bandomInt(dimensions.outputWidth / 2, 2) * Rp.randomSign()}, ${Rp.bandomInt(dimensions.outputHeight / 2, 2) * Rp.randomSign()}, ${ math.randomInt(-100, 1000)});
                  pointLight${i}.intensity = ${math.random(0, 3)};
                  pointLight${i}.distance = ${Rp.bandom(1000, -3)};
                  scene.add(pointLight${i});
                  \n`);
                }

                // directionallights

                for (let i = 0; i < directionalLights; i++) {

                    let directionalLightColor = randomColor(params, 0.33);
                    console.log(`directionalLightColor${i} `, directionalLightColor);

                    outf.write(`
                  var directionalLight${i} = new THREE.DirectionalLight(${directionalLightColor});
                  directionalLight${i}.position.set(${Rp.bandomInt(dimensions.outputWidth / 2, 2) * Rp.randomSign()}, ${Rp.bandomInt(dimensions.outputHeight / 2, 2) * Rp.randomSign()}, ${ math.randomInt(-100, 1000)});
                  directionalLight${i}.intensity = ${math.random(0, 3)};
                  directionalLight${i}.distance = ${Rp.bandom(1000, -3)};
                  scene.add(directionalLight${i});
                  \n`);
                }


                // ambient light
                outf.write(`
                  var ambientLight = new THREE.AmbientLight(${params.ambientLight});
                  scene.add(ambientLight);

                  renderer.setClearColor(new THREE.Color(${backgroundColor}));

                  renderer.setSize( width, height );

                  document.body.appendChild( renderer.domElement );

                  renderer.render( scene, camera );
                \n`);

                outf.write(`}\n`); // end draw()

                outf.write(`</script>\n`);

                outf.write(`
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
