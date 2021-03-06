(function() {

    "use strict";

    var seedrandom = require('seedrandom');
    var randomSeed = (new Date()).getTime();

    // must be first
    seedrandom(randomSeed, {
        global: true
    });

    // ./create-3d-local functals/small/functal-20160213075951459.jpg

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

    function randomColor(params, maxLightness) {
        let k = math.randomInt(params.xy.length);
        let yy = params.xy[k].y;
        let xx = params.xy[k].x;

        let x = xx + params.dimensions.inputWidth / 2 - params.dimensions.outputWidth / 2;
        let y = yy + params.dimensions.inputHeight / 2 - params.dimensions.outputHeight / 2;
        let rgb = params.data[x][y].rgb;

        let color = `0x${num2hex(math.floor(rgb.r * maxLightness))}${num2hex(math.floor(rgb.g * maxLightness))}${num2hex(math.floor(rgb.b * maxLightness))}`;

        return color;
    }

    function setWireframe(params, outf) {

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
    }

    function setPosition(params, outf) {
        outf.write(`
        var shape = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

        shape.rotation.x = ${params.rotation.x};
        shape.rotation.y = ${params.rotation.y};
        shape.rotation.z = ${params.rotation.z};

        shape.position.x = options.x;
        shape.position.y = options.y;
        shape.position.z = options.z;

        shape.castShadow = true;
        shape.receiveShadow = true;

        scene.add(shape);
      }
      \n`);
    }

    //------------- shapes

    let shapeLine = {
        fn: "ln",
        sample: () => (isDev ? 0.02 : 0.4),
        init: () => {
        }
    };

    let shapeCylinder = {
        fn: "cyl",
        sample: (params) => (isDev ? 1
                : 1) / math.square(Math.max(params.maxRadius, params.maxRadius2)),
        init: () => {
        }
    };

    let shapeBox = {
        fn: "box",
        sample: (params) => (isDev ? 1
                : 1) / math.square(Math.max(params.maxRadius, params.maxRadius2)),
        init: () => {
        }
    };

    let shapeSphere = {
        fn: "sphere",
        sample: (params) => (isDev ? 1
                : 1) / math.pow(params.maxRadius, 1.5),
        init: (params) => {
            params.maxRadius = math.max(10, params.maxRadius);
            params.segments = math.max(4, params.segments);
        }
    };

    let shapePolyhedron = {
        fn: "poly",
        sample: (params) => (isDev ? 1
                : 1) / math.pow(params.maxRadius2, 1.5),
        init: (params) => {
            params.maxRadius2 = math.max(64, params.maxRadius2);
        }
    };

    let shapeTorus = {
        fn: "torus",
        sample: (params) => (isDev ? 1
                : 1) / math.pow(params.maxRadius + params.maxRadius2, 2),
        init: (params) => {
            params.maxRadius = math.max(10, params.maxRadius);
            params.segments = math.max(4, params.segments);
        }
    };

    let shapeKnot = {
        fn: "knot",
        sample: (params) => (isDev ? 1
                : 1) / math.pow(params.maxRadius + params.maxRadius2, 2),
        init: (params) => {
            params.maxRadius = math.min(20, params.maxRadius);
            params.maxRadius2 = math.max(2 * params.maxRadius, params.maxRadius2);
            params.segments = math.max(4, params.segments);
        }
    };

    let shapeTubular = {
        fn: "tub",
        // around 20,000 points base
        sample: (params) => math.pow(params.dimensions.outputWidth * params.dimensions.outputHeight, -0.3) /  math.pow(params.maxRadius, 2),
        init: (params) => {
          params.maxRadius = math.randomInt(1, 16);
        }
    };

    let shapePlane = {
        fn: "plane",
        sample: (params) => (isDev ? 1
                : 1) / params.maxRadius / 8,
        init: () => {
        }
    };

    let shapeCircle = {
        fn: "circle",
        sample: (params) => (isDev ? 1
                : 1) / math.square(params.maxRadius2),
        init: (params) => {
            params.maxRadius2 = math.max(10, params.maxRadius2);
        }
    };

    let shapeRing = {
        fn: "ring",
        sample: (params) => (isDev ? 1
                : 1) / math.square(params.maxRadius + params.maxRadius2),
        init: () => {
        }
    };

    let shapeWall = {
        fn: "wall",
        sample: (params) => (isDev ? 1
                : 1) / params.dimensions.outputWidth / math.randomInt(1, 10),
        init: () => {
        }

    };

    let shapeLathe = {
        fn: "lathe",
        sample: (params) => 1 / math.pow(params.maxRadius * params.maxRadius2, 1.4),
        init: (params) => {
            params.maxRadius = math.max(10, params.maxRadius);
            params.maxRadius2 = math.max(10, params.maxRadius2);
        }
    };

    let shapePoint = {
        fn: "pt",
        sample: (params) => (isDev ? 0.1
                : 1) / math.square(params.pointSize),
        init: () => {
        }
    };

    let shapes = [
        {
            shape: shapeLine,
            weight: 80
        },
        {
            shape: shapeCircle,
            weight: 10
        },
        {
            shape: shapeRing,
            weight: 5
        },
        {
            shape: shapeCylinder,
            weight: 400
        },
        {
            shape: shapeBox,
            weight: 5
        },
        {
            shape: shapeSphere,
            weight: 100
        },
        {
            shape: shapePolyhedron,
            weight: 20
        },
        {
            shape: shapeTorus,
            weight: 50
        },
        {
            shape: shapeKnot,
            weight: 300
        },
        {
            shape: shapePlane,
            weight: 20
        },
        {
            shape: shapeLathe,
            weight: 300
        },
        {
            shape: shapeTubular,
            weight: 300
        },
        {
            shape: shapeWall,
            weight: 150
        },
        {
            shape: shapePoint,
            weight: 50
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

            let maxRadius = 1 + Rp.bandomInt(128, 2);
            let maxRadius2 = (maxRadius < 10 ? 10 + Rp.bandomInt(128, 2) : (math.random() < 0.5 ? maxRadius : 1 + Rp.bandomInt(128, 2)));

            let maxShininess = math.randomInt(0, 256);

            let spotLights = Rp.bandomInt(4, 1);
            let pointLights = (spotLights === 0 ? 1 : 0) + Rp.bandomInt(4, 1);
            let directionalLights = (spotLights + pointLights === 0 ? 1 : 0) + Rp.bandomInt(4, 1);

            let segments = math.randomInt(1, 65);

            let planeSegments = {
                w: math.randomInt(1, 16),
                h: math.randomInt(1, 16),
                d: math.randomInt(1, 16)
            };

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

            let knotP = 2 + Rp.bandomInt(7, 1);
            let knotQ = 2 + Rp.bandomInt(7, 1);

            let polyhedron = Rp.wandom(['Icosa', 'Tetra', 'Dodeca', 'Octa']);

            // any initial angle
            let theta = math.random(0, Math.PI * 2);

            let fieldOfView = 60 + Rp.bandom(30, 2);

            let cameraPositionZ = math.random(1000, 2000);

            let maxz = cameraPositionZ * 0.6;

            let pointSize = math.randomInt(1, 5);

            let shape = Rp.wandom(shapes).shape;

            let params = {
                randomSeed,
                maxz,
                maxRadius,
                maxRadius2,
                pointSize,
                maxShininess,
                spotLights,
                pointLights,
                directionalLights,
                segments,
                planeSegments,
                wireframe,
                wireframeLinewidth,
                theta,
                polyhedron,
                minOpacity,
                maxOpacity,
                openEnded,
                arc,
                knotP,
                knotQ,
                rotation,
                fieldOfView,
                cameraPositionZ,
                shape
            };

            shape.init(params);

            console.log('params ', JSON.stringify(params, null, 2));

            params.dimensions = dimensions;

            try {
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

                var outf = fs.createWriteStream(`${outputFilename}`);

                outf.write(`<!DOCTYPE html>
                <html lang='en'>
                <head>
                    <meta charset='UTF-8'>
                    <title>${outputFilename}</title>
                    <script src='file://${process.cwd()}/libs/three.min.js'></script>
                </head>
                <body style='margin:0; padding:0; overflow: hidden'>\n`);

                outf.write(`<script>\n`);

                outf.write(`
                function generatePoints() {

                  var points = [];

                  var n = ${3 + Rp.bandomInt(100, 3)};

                  var w = ${params.maxRadius};

                  for (var i = 0; i < n; i++) {
                    var x = -w/2 + Math.round(Math.random() * w);
                    var y = -w/2 + Math.round(Math.random() * w);
                    var z = -w/2 + Math.round(Math.random() * w);

                    points.push(new THREE.Vector3(x, y, z));
                  }

                  return points;
                }
                \n`);

                outf.write(`
                function generateLathe() {

                  var points = [];
                  var width = ${params.maxRadius};
                  var minWidth = Math.random() * width;
                  var height = 8 * ${params.maxRadius2};
                  var n = ${3 + Rp.bandomInt(100, 1)};
                  var freq1 = Math.pow(Math.random(), 4) * 10;
                  var freq2 = Math.pow(Math.random(), 4) * 10;
                  var phase1 = Math.PI * 2 * Math.random();
                  var phase2 = Math.PI * 2 * Math.random();

                  for (var i = 0; i < n; i++) {
                      points.push(new THREE.Vector3((Math.sin(phase1 + i * freq1 * Math.PI) + Math.cos(phase2 + i * freq2 * Math.PI)) * width + minWidth, 0, -height/2 + height * i / n ));
                  }

                  return points;
                }
                \n`);

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

                setWireframe(params, outf);

                outf.write(`
                  var cylinder = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  cylinder.rotation.x = ${params.rotation.x};
                  cylinder.rotation.y = ${params.rotation.y};
                  cylinder.rotation.z = ${params.rotation.z};

                  cylinder.position.x = options.x;
                  cylinder.position.y = options.y;
                  cylinder.position.z = options.z / 2;

                  cylinder.castShadow = true;
                  cylinder.receiveShadow = true;

                  scene.add(cylinder);
                }
                \n`);

                // add box

                outf.write(`
                function box(scene, options) {

                  var geometry = new THREE.BoxGeometry(options.radius, options.radius2, options.z, ${params.planeSegments.w}, ${params.planeSegments.h}, ${params.planeSegments.d});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                outf.write(`
                  var box = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  box.rotation.x = ${params.rotation.x};
                  box.rotation.y = ${params.rotation.y};
                  box.rotation.z = ${params.rotation.z};

                  box.position.x = options.x;
                  box.position.y = options.y;
                  box.position.z = options.z / 2;

                  box.castShadow = true;
                  box.receiveShadow = true;

                  scene.add(box);
                }
                \n`);

                // add sphere

                outf.write(`
                function sphere(scene, options) {

                  var geometry = new THREE.SphereGeometry(options.radius * (1 - options.hsl.l), ${params.segments}, ${params.segments});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                setPosition(params, outf);


                // add polyhedron

                outf.write(`
                function poly(scene, options) {

                  var geometry = new THREE.${params.polyhedron}hedronGeometry(options.radius2 * (1 - options.hsl.l), 0);

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                setPosition(params, outf);

                // add torus

                outf.write(`
                function torus(scene, options) {

                  var geometry = new THREE.TorusGeometry(options.radius + options.radius2, options.radius, ${params.segments}, ${params.segments}, ${params.arc});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                outf.write(`
                  var torus = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  torus.rotation.y = ${params.theta} + 2 * Math.PI * options.hsl.h;

                  torus.position.x = options.x;
                  torus.position.y = options.y;
                  torus.position.z = options.z;

                  torus.castShadow = true;
                  torus.receiveShadow = true;

                  scene.add(torus);
                }
                \n`);

                // add knot

                outf.write(`
                function knot(scene, options) {

                  var size = (1 - options.hsl.l / 2);

                  var geometry = new THREE.TorusKnotGeometry(size * (options.radius + options.radius2), size * (options.radius), ${params.segments}, ${params.segments}, ${params.knotP}, ${params.knotQ});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                outf.write(`
                  var knot = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  knot.rotation.y = ${params.theta} + 2 * Math.PI * options.hsl.h;

                  knot.position.x = options.x;
                  knot.position.y = options.y;
                  knot.position.z = options.z;

                  knot.castShadow = true;
                  knot.receiveShadow = true;

                  scene.add(knot);
                }
                \n`);

                // add tubular
                // just a single large shape

                outf.write(`
                function tub(scene, options) {

                  scene.localStorage.points = scene.localStorage.points || [];

                  scene.localStorage.points.push(new THREE.Vector3(options.x, options.y, options.z));

                  // start draw after last one

                  if (scene.localStorage.points.length === options.numberOfPoints) {

                    let radius = ${ params.maxRadius };
                    let numberOfPoints = scene.localStorage.points.length;
                    let segments = numberOfPoints;
                    let radiusSegments = ${math.randomInt(4, params.segments)};
                    let closed = true;

                    var geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(scene.localStorage.points), segments, radius, radiusSegments, closed);

                    options.color = ${ randomColor(params, 1)};

                    ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                outf.write(`
                    var tubular = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                    tubular.position.x = 0;
                    tubular.position.y = 0;
                    tubular.position.z = 0;

                    tubular.castShadow = true;
                    tubular.receiveShadow = true;

                    scene.add(tubular);

                  } // end draw

                }
                \n`);


                // add plane

                outf.write(`
                function plane(scene, options) {

                  let geometry = new THREE.PlaneGeometry(options.radius, options.z, ${params.planeSegments.w}, ${params.planeSegments.h});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                outf.write(`
                  let plane = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  plane.rotation.x = ${Math.PI / 2};

                  plane.position.x = options.x;
                  plane.position.y = options.y;
                  plane.position.z = 0;

                  plane.castShadow = true;
                  plane.receiveShadow = true;

                  scene.add(plane);
                }
                \n`);

                // add circle

                outf.write(`
                function circle(scene, options) {

                  let geometry = new THREE.CircleGeometry(options.radius2, ${params.segments});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                outf.write(`
                  let circle = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  // circle.rotation.x = ${params.theta} + 2 * Math.PI * options.hsl.h;
                  circle.rotation.y = ${params.theta} + 2 * Math.PI * options.hsl.h;

                  circle.position.x = options.x;
                  circle.position.y = options.y;
                  circle.position.z = options.z;


                  circle.castShadow = true;
                  circle.receiveShadow = true;

                  scene.add(circle);
                }
                \n`);

                // add ring

                outf.write(`
                function ring(scene, options) {

                  let geometry = new THREE.RingGeometry(options.radius, options.radius + options.radius2, ${params.segments}, ${params.segments}, ${params.theta});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                outf.write(`
                  let ring = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  // ring.rotation.x = ${params.theta} + 2 * Math.PI * options.hsl.h;
                  ring.rotation.y = ${params.theta} + 2 * Math.PI * options.hsl.h;

                  ring.position.x = options.x;
                  ring.position.y = options.y;
                  ring.position.z = options.z;


                  ring.castShadow = true;
                  ring.receiveShadow = true;

                  scene.add(ring);
                }
                \n`);

                // add wall

                let length = params.dimensions.outputWidth;

                outf.write(`
                function wall(scene, options) {

                  let geometry = new THREE.PlaneGeometry(${length}, options.z, ${params.planeSegments.w}, ${params.planeSegments.h});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                outf.write(`
                  let plane = new THREE.SceneUtils.createMultiMaterialObject( geometry, materials );

                  plane.rotation.x = Math.PI / 2;
                  plane.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
                  plane.rotation.z = Math.PI / 2;

                  plane.position.x = options.x;
                  plane.position.y = options.y;
                  plane.position.z = 0;

                  plane.castShadow = true;
                  plane.receiveShadow = true;

                  scene.add(plane);
                }
                \n`);

                // add lathe

                outf.write(`
                function lathe(scene, options) {

                  var geometry = new THREE.LatheGeometry(options.lathe, ${params.segments.h}, ${params.theta}, ${params.arc});

                  ${phongMaterial()}

                \n`);

                setWireframe(params, outf);

                setPosition(params, outf);

                // add point

                outf.write(`
                function pt(scene, options) {

                  var material = new THREE.PointsMaterial({
                    size: ${params.pointSize},
                    vertexColors: true,
                    opacity: options.opacity,
                    transparent: true,
                    color: 0xffffff});

                  var geometry = new THREE.Geometry();
                  var point = new THREE.Vector3(options.x, options.y, options.z );

                  geometry.vertices.push(point);
                  geometry.colors.push(new THREE.Color(options.color));

                  var particle = new THREE.Points(geometry, material);

                  scene.add(particle);
                }
                \n`);

                // --------------------

                outf.write(`
                  draw();

                  function draw() {

                      var width = ${dimensions.outputWidth};
                      var height = ${dimensions.outputHeight};

                      var scene = new THREE.Scene();
                      var s = scene;

                      var points = generatePoints();
                      var lathePoints = generateLathe();

                      // general storage
                      s.localStorage = {};

                \n`);

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
                      specular: ${specular},
                      hsl: {h: ${hsl.h}, s: ${hsl.s}, l: ${hsl.l}},
                      points: points,
                      lathe: lathePoints,
                      numberOfPoints: ${xy.length}
                    });
                    \n`);
                }

                // end

                let backgroundColor = '0x000000';

                params.ambientLight = randomColor(params, 0.5);
                console.log('params.ambientLight ', params.ambientLight);

                // camera
                outf.write(`
                  var renderer = new THREE.WebGLRenderer();

                  renderer.shadowMapEnabled = true;
                  renderer.shadowMapType = THREE.BasicShadowMap;

                  var camera = new THREE.PerspectiveCamera( ${params.fieldOfView}, width / height, 0.1, 2000 );

                  camera.position.x = ${Rp.bandomInt(dimensions.outputWidth / 2, 2) * Rp.randomSign()};
                  camera.position.y = ${Rp.bandomInt(dimensions.outputHeight / 2, 2) * Rp.randomSign()};
                  camera.position.z = ${params.cameraPositionZ};

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
                  spotLight${i}.castShadows = true;

                  // var target = new THREE.Object3D();
                  // target.position = new THREE.Vector3(${Rp.bandomInt(dimensions.outputWidth / 2, 2) * Rp.randomSign()}, ${Rp.bandomInt(dimensions.outputHeight / 2, 2) * Rp.randomSign()}, ${ Rp.bandomInt(1000, -2)});
                  // spotLight${i}.target = target;

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
                  directionalLight${i}.castShadows = true;
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
