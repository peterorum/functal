(function() {

  // old version - uses NLP to add title

  "use strict";

  var version = '2.2.4';

  var seedrandom = require('seedrandom');
  var randomSeed = (new Date()).getTime();

  // must be first
  seedrandom(randomSeed, {
    global: true
  });

  var math = require('mathjs');
  var moment = require('moment');
  var Q = require('q');
  var fs = require('fs');
  var fsq = require('./fsq');
  var PNG = require('node-png').PNG;
  var jpeg = require('jpeg-js');
  var R = require('ramda');
  var Rp = require('./plus-fp/plus-fp');
  var s3 = require('./s3client');
  // var util = require('util')

  var clr = require('./color');
  var pal = require('./palette');

  var pickers = require('./pickers');
  var limitTests = require('./limitTests');
  var processes = require('./processes');
  var modifiers = require('./modifiers');

  var promise = require("bluebird");
  var mongodb = promise.promisifyAll(require("mongodb"));
  var mongoClient = promise.promisifyAll(mongodb.MongoClient);

  // smaller image, no tweet
  var isDev = /Apple_Terminal|iterm\.app/i.test(process.env.TERM_PROGRAM);

  var functalsFolder = 'functals';

  //----------- fractal functions

  var fractal = {};

  fractal.jpegQuality = 70;
  fractal.maxCount = 20000;

  fractal.finite = R.curry(function(max, z) {

    if (R.is(Number, z)) {

      if (!isFinite(z) || isNaN(z)) {

        z = max;
      }
    }
    else {

      if (!isFinite(z.re) || isNaN(z.re)) {

        z.re = max;
      }

      if (!isFinite(z.im) || isNaN(z.im)) {

        z.im = max;
      }
    }

    return z;
  });

  fractal.isOkToMake = function() {

    var deferred = Q.defer();

    if (isDev) {

      deferred.resolve(true);
    }
    else {

      s3.list('functal-images').then(function(result) {

        console.log('bucket count', result.count);

        var ok = result.count < fractal.maxCount;

        deferred.resolve(ok);
      }, function() {
        console.log('error reading buckets');

        // proceed anyway
        deferred.resolve(true);
      });
    }

    return deferred.promise;
  };

  fractal.isDone = function(functal, z) {

    return functal.test(z);
  };

  fractal.escapeCount = function(functal, x, y) {

    var count = 0;

    var zs = [];

    var z = functal.z(x, y);
    var c = functal.c(x, y);

    zs[0] = z;

    var maxCount = functal.maxCount;

    // count how long the iteration takes to break the limit

    var done = false;

    while (!done && count < maxCount - 1) {

      z = functal.finite(functal.process(z, c));

      zs.push(z);

      done = fractal.isDone(functal, zs);

      count++;
    }

    var zsAdj = functal.adjzs.length ? R.map(R.compose.apply(functal, R.pluck('fn', functal.adjzs)), zs) : zs;

    var result = {
      escape: count / maxCount,
      zs: zsAdj,
      unescaped: (count >= maxCount - 1)
    };

    return result;
  };

  fractal.getModifierValues = function(functal, result) {

    var mods = R.map(function(m) {

      return m(functal, result);
    }, functal.modifiers);

    return mods;
  };

  fractal.process = function(functal, palette, sample) {

    // sample is undefined for full resolution
    // use eg 3 to take points a third of the way in

    // store image results
    var data = [];

    // default to every pixel
    var xincr = 1;
    var yincr = 1;

    // if sample, only do a few
    if (sample) {

      xincr = functal.width / sample;
      yincr = functal.height / sample;
    }

    // scaled increment
    var fxincr = (functal.range.x2 - functal.range.x1) / functal.width;
    var fyincr = (functal.range.y2 - functal.range.y1) / functal.height;

    functal.startTime = (new Date()).getTime();

    // x,y  pixel position
    var x = 0;
    var eta = '';

    // i,j index into data result matrix
    var i = 0;

    functal.accept = true;

    while (x < functal.width && functal.accept) {

      // translate to the sub-range
      var fx = functal.range.x1 + fxincr * x;

      data[i] = [];

      var y = 0;
      var j = 0;

      while (y < functal.height && functal.accept) {

        var fy = functal.range.y1 + fyincr * y;

        // all inputs & outputs are 0..1
        var result = fractal.escapeCount(functal, fx, fy);

        if (sample && result.unescaped) {

          functal.accept = false;

          break;
        }

        var rgb;

        if (!R.isEmpty(functal.modifiers)) {

          var mods = fractal.getModifierValues(functal, result);
          rgb = functal.picker.getColor(functal, mods, result, palette);
        }
        else {

          var hsl = pal.getColor(palette, result.escape);
          rgb = clr.hsl2rgb(hsl);
        }

        data[i][j] = {
          rgb: rgb,
          escape: result.escape
        };

        y += yincr;
        j++;
      }

      x += xincr;
      i++;

      if (!sample) {

        var duration = moment.duration(((new Date()).getTime() - functal.startTime) / i * (functal.width - i));

        var neweta = duration.humanize();

        if (neweta !== eta) {

          eta = neweta;
          console.log(eta);
        }

        if (duration.asHours() >= 8) {

          functal.accept = false;

          throw "time overflow";
        }
      }
    }

    return data;
  };

  fractal.init = function(options) {

    var functal = {};

    functal.version = options.version();
    functal.seed = randomSeed;

    functal.limit = options.limit();
    functal.finite = fractal.finite(functal.limit);

    functal.width = options.width();
    functal.height = options.height();
    functal.maxCount = options.maxCount();
    functal.range = options.range();
    functal.rangeWidth = functal.range.x2 - functal.range.x1;

    functal.sampleCount = 11;

    functal.set = {
      name: options.set.name,
      params: options.set.params()
    };

    functal.minStdDev = options.minStdDev();
    functal.minHslStats = options.minHslStats();
    functal.z = options.set.z;
    functal.c = options.set.c;

    functal.filename = options.filename();
    functal.file = options.file();

    var test = Rp.wandom(limitTests.tests);
    functal.testName = test.name;
    functal.test = test.fn;

    functal.adjzs = R.times(function() {

      return Rp.wandom(options.z2zfns).fn();
    }, Rp.bandomInt(4, 2));

    // wrap with finite
    R.forEach(function(f) {

      f.fn = R.compose(functal.finite, f.fn);
    }, functal.adjzs);

    var process = Rp.wandom(processes.processes);
    functal.processName = process.name;
    functal.process = process.fn;
    functal.pow = options.pow();

    var modifierModifierFns = [{
      fn: R.identity,
      weight: 1
    }, {
      fn: math.square,
      weight: 1
    }, {
      fn: math.abs,
      weight: 1
    }, {
      fn: math.round,
      weight: 1
    }, {
      fn: R.curry(function cospi(x) {

        return math.cos(math.pi * x);
      }),
      weight: 1
    },];

    functal.modifierParams = [];
    functal.reducers = [];

    var modifierCount = 1 + Rp.bandomInt(10, 1);

    functal.modifiers = R.times(function() {

      var modifier = Rp.wandom(modifiers.modifiers).fn(functal);

      var reducer = Rp.wandom(modifiers.reducers);
      functal.reducers.push(reducer);

      var mmfn = Rp.wandom(modifierModifierFns).fn;

      var modfn = R.compose(mmfn, functal.finite, reducer.fn, modifier.fn);

      functal.modifierParams.push(modifier.params);

      return modfn;
    }, modifierCount);

    var picker = Rp.wandom(pickers.pickers);

    functal.picker = picker;

    functal.mixers = functal.picker.getMixers(functal.modifiers);

    // weight factors
    functal.layers = [];

    // must sum to 1
    var layerRemaining = 1;

    R.times(function() {

      var factor = Rp.bandom(layerRemaining, 2);

      layerRemaining -= factor;

      functal.layers.push(factor);

    }, functal.modifiers.length);

    var layerSum = R.isEmpty(functal.layers) ? 0 : math.sum(functal.layers);

    // dregs to original escape
    functal.baseLayer = 1.0 - layerSum;

    return functal;
  };

  // ---------- sample a functal

  fractal.calcVariation = function(options, palette) {

    var functal = fractal.init(options);

    // get sampled data
    var data = fractal.process(functal, palette, functal.sampleCount);

    if (functal.accept) {

      // make easier to analyze
      var flatData = R.flatten(data);

      // // calc std dev for the sample data
      var escapes = R.map(function(d) {

        return d.escape;
      }, flatData);

      // store in object to facilitate dumping
      functal.stdDev = math.std(escapes);

      // calc h s l std dev
      var hsls = R.map(function(d) {

        var hsl = clr.rgb2hsl(d.rgb);

        hsl.i = pal.getIntensity(hsl);

        return hsl;
      }, flatData);

      functal.hslStats = pal.calcHslStats(hsls);

      functal.uniques = R.uniq(R.pluck('l', hsls)).length;
    }

    return functal;
  };

  // ---------- make a functal

  fractal.make = function(functal, palette) {

    try {

      // create fractal

      functal.palette = R.omit(['colors'], palette);

      console.log('--- creating');
      fractal.dump(functal);

      functal.data = fractal.process(functal, palette);
    } catch (ex) {

      functal.error = ex;
    }

    // store time taken
    functal.time = ((new Date()).getTime() - functal.startTime);
    functal.duration = moment.duration(functal.time).humanize();
  };

  // ------------ dump for debugging

  fractal.dump = function(functal) {

    console.log(JSON.stringify(R.omit(['zs', 'data', 'modifiers'], functal), null, 4));
  };

  // ------------ output to a png image

  fractal.png = function(functal) {

    var deferred = Q.defer();

    var image = new PNG({
      width: functal.width,
      height: functal.height,
      filterType: -1
    });

    var data = functal.data;

    for (var y = 0; y < image.height; y++) {

      for (var x = 0; x < image.width; x++) {

        var rgb = data[x][y].rgb;

        var idx = (image.width * y + x) << 2;

        image.data[idx] = rgb.r;
        image.data[idx + 1] = rgb.g;
        image.data[idx + 2] = rgb.b;
        image.data[idx + 3] = 0xff;
      }
    }

    image.pack().pipe(fs.createWriteStream(functal.file + '.png')).on('close', function() {

      deferred.resolve();
    });

    return deferred.promise;
  };

  // ------------ output to a jpeg image

  fractal.jpg = function(functal) {

    var deferred = Q.defer();

    var frameData = new Buffer(functal.width * functal.height * 4);

    var data = functal.data;

    for (var y = 0; y < functal.height; y++) {

      for (var x = 0; x < functal.width; x++) {

        var rgb = data[x][y].rgb;

        var idx = (functal.width * y + x) << 2;

        frameData[idx] = rgb.r;
        frameData[idx + 1] = rgb.g;
        frameData[idx + 2] = rgb.b;
        frameData[idx + 3] = 0xff;
      }
    }

    var rawImageData = {
      data: frameData,
      width: functal.width,
      height: functal.height
    };

    var jpegImageData = jpeg.encode(rawImageData, fractal.jpegQuality);

    var wstream = fs.createWriteStream(functal.file + '.jpg');

    wstream.write(jpegImageData.data);

    wstream.end(function() {

      deferred.resolve();

    });

    return deferred.promise;
  };


  fractal.setOptions = function(size) {

    var filename = 'functal-' + moment.utc().format('YYYYMMDDHHmmssSSS');

    // size: small, medium, large
    var sizes = {
      small: {
        width: 512,
        height: 512
      },
      medium: {
        width: 768,
        height: 1024
      },
      large: {
        width: 2048,
        height: 2732
      }
    };

    var options = {
      version: function() {

        return version;
      },

      width: function() {

        return sizes[size].width;
      },
      height: function() {

        return sizes[size].height;
      },
      maxCount: function() {

        // 16..512, around 256

        return 256 + Rp.bandomInt(256, 5) - Rp.bandomInt(240, 5);
      },
      limit: function() {

        return 2 + Rp.bandomInt(8, 3);
      },
      filename: function() {

        return filename;
      },
      file: function() {

        // filename with utc time

        return functalsFolder + '/' + size + '/' + filename;
      },
      minStdDev: function() {

        return 0.004;
      },
      minHslStats: function() {

        return pal.getExpectedHslStats();
      },
      pow: function() {

        return math.random(2, 10);
      }
    };

    // keep selected subarea the same aspect ratio as the image

    options.range = function() {

      var aspect = options.width() / options.height();

      // range is from -max to max
      var max = 2;

      var width = math.random(0.001, 2 * max);

      var x1 = math.random(-max, max - width);

      var x2 = x1 + width;

      var height = width / aspect;

      var y1 = math.random(-max, max - height);
      var y2 = y1 + height;

      return {
        x1: x1,
        x2: x2,
        y1: y1,
        y2: y2
      };
    };

    // types of fractals with different initial z & c.
    var sets = [{
      name: 'mandelbrot',
      z: function() {

        return math.complex(0, 0);
      },
      c: function(x, y) {

        return math.complex(x, y);
      },
      params: function() {

        return {};
      }
    }, {
      name: 'julia',
      z: function(x, y) {

        return math.complex(x, y);
      },
      c: R.once(function() {

        var cmax = 1.75;

        var c = math.complex(math.random(-cmax, cmax), math.random(-cmax, cmax));

        return c;
      }),
      params: function() {

        // stored for recreating

        return {
          c: this.c()
        };
      }
    }];

    // pick a random set type
    options.set = sets[math.randomInt(0, sets.length)];

    options.z2zfns = [{
      fn: function() {

        return {
          name: "square",
          fn: math.square
        };
      },
      weight: 1
    }, {
      fn: function() {

        return {
          name: "sqrt",
          fn: math.sqrt,
        };
      },
      weight: 1
    }, {
      fn: function() {

        return {
          name: "sin",
          fn: math.sin
        };
      },
      weight: 1
    }, {
      fn: function() {

        return {
          name: "cos",
          fn: math.cos
        };
      },
      weight: 1
    }, {
      fn: function() {

        return {
          name: "log",
          fn: math.log
        };
      },
      weight: 1
    }, {
      fn: function() {

        var factor = math.randomInt(1, 1000);

        return {
          name: "floor mod",
          factor: factor,
          fn: R.curry(function(f, z) {

            return math.chain(z).multiply(f).floor().divide(f).done();
          })(factor)
        };
      },
      weight: 1,
    }, {
      fn: function() {

        return {
          name: "reciprocal",
          fn: function reciprocal(z) {

            return math.divide(math.complex(1, 0), z);
          }
        };
      },

      weight: 1
    }, {
      fn: function() {

        return {
          name: "trigxy",
          fn: (function trigxy() {

            var trig1 = Rp.wandom([math.sin, math.cos]);
            var trig2 = Rp.wandom([math.sin, math.cos]);

            var fxy = {
              freq1: math.random(20),
              freq2: math.random(20),
              trig1: trig1,
              trig2: trig2,
              name1: Rp.nameOf(trig1),
              name2: Rp.nameOf(trig2)
            };

            var fn = function trigxy(z) {

              return math.complex(fxy.trig1(math.mod(fxy.freq1 * z.re, math.pi * 2)), fxy.trig2(math.mod(fxy.freq2 * z.im, math.pi * 2)));
            };

            fn.params = fxy;

            return fn;
          })()
        };
      },
      weight: 1
    }, {
      fn: function() {

        return {
          name: "fraction",
          fn: function fraction(z) {

            return math.complex(z.re - math.floor(z.re), z.im - math.floor(z.im));
          }
        };
      },
      weight: 1
    }];

    return options;
  };


  // ------------ make a functal


  fractal.create = function(dbFunctal, dbTopics) {

    var deferred = Q.defer();

    var options, palette, functal;

    var size = (isDev ? 'small' : 'medium');

    // use different options until a fractal with enough variety is found

    var ok = false;
    var attempts = 0;

    do {

      attempts += 1;

      try {

        options = fractal.setOptions(size);

        palette = pal.setPalette();

        functal = fractal.calcVariation(options, palette);

        // fail if not enough variation in the image sample

        ok = functal.accept &&
          functal.stdDev > functal.minStdDev &&
          functal.hslStats.s.std > functal.minHslStats.s.std &&
          functal.hslStats.l.std > functal.minHslStats.l.std &&
          functal.hslStats.l.max > functal.minHslStats.l.max &&
          functal.hslStats.i.max > functal.minHslStats.i.max &&
          pal.isHueModeOk(functal.hslStats.h.mode) &&
          pal.isHueModeSLOk(functal.hslStats.h.modesl) &&
          functal.uniques > functal.sampleCount &&
          true;

      } catch (ex) {

        ok = false;
        functal = {
          error: ex.toString()
        };
      }

      if (isDev && !ok) {

        fractal.dump(functal);
        console.log('--- rejected');
      }

    } while (!ok);

    functal.attempts = attempts;

    // make full fractal

    try {

      fractal.make(functal, palette);
    } catch (ex) {

      ok = false;
      functal.error = ex.toString();
      functal.accept = false;
    }

    console.log('=== total duration: ', functal.duration);

    if (functal.accept) {

      functal.topic = modifiers.getTopic(functal);

      // save options spec
      fsq.writeFile(functal.file + '.json', JSON.stringify(R.omit(['zs', 'data', 'modifiers'], functal), null, 4))
        .then(function() {

          // save jpg
          return fractal.jpg(functal);
        })
        // .then(function() {

        //   // save processing
        //   return fractal.processing(functal);
        // })
        .then(function() {

          // get title

          console.log('getting title for topic:' + functal.topic);

          return dbTopics.collection('titles').findOneAsync({
            topic: functal.topic
          });
        })
        .then(function(doc) {

          if (doc) {

            console.log(functal.topic + ': ' + doc.title);

            var image = {
              name: functal.filename + '.jpg',
              title: doc.title,
              topic: functal.topic
            };

            // delete topic & save title
            return dbTopics.collection('titles').removeAsync(doc).then(function() {
              return dbFunctal.collection('images').insertAsync(image);
            });
          }
          else {
            console.log('no title for topic');
          }
        })
        .then(function() {
          if (!isDev) {
            return s3.upload('functal-images', functal.filename + '.jpg', functal.file + '.jpg');
          }
        })
        .then(function() {
          if (!isDev) {
            return s3.upload('functal-json', functal.filename + '.json', functal.file + '.json');
          }
        })
        .then(function() {
          if (!isDev) {
            return fsq.unlink(functal.file + '.jpg');
          }
        })
        .then(function() {
          if (!isDev) {
            return fsq.unlink(functal.file + '.json');
          }
        })
        .done(function() {
          deferred.resolve();
        }, function(ex) {

          console.log('error - rejecting promise');
          console.log(ex);

          deferred.reject();
        });
    }
    else {

      deferred.reject();
    }

    return deferred.promise;
  };

  // kick off

  mongoClient.connectAsync(process.env.mongo_functal).then(function(client) {
    var dbFunctal = client.db('functal');
    var dbTopics = client.db('topics');

    fractal.isOkToMake().then(function(ok) {

      if (ok) {
        // make fractal

        var count = (isDev ? 1 : 1);

        var result = Q(); // jshint ignore:line

        for (var i = 0; i < count; i++) {
          result = result.then(function() {
            return fractal.create(dbFunctal, dbTopics);
          }, function() {
            console.log('fail - rejected');
          });
        }

        result.finally(function() {
          console.log('close');
          client.close();
        });
      }
      else {
        // sleep for an hour if enough files already & then exit for shell script to restart

        console.log('full - sleeping', new Date());

        setTimeout(function() {
          client.close();
        }, 60 * 60 * 1000);
      }
    });
  });
}());
