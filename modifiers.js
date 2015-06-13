(function()
{
    "use strict";

    var math = require('mathjs');

    var R = require('ramda');
    var Rp = require('./plus-fp/plus-fp');

    // modifying the final result
    // return -1..1

    exports.reducers = [
        {
            name: 'min',
            fn: math.min,
            weight: 1
        },
        {
            name: 'max',
            fn: math.max,
            weight: 1
        }
        // {
        //     name: 'last',
        //     fn: R.last,
        //     weight: 1
        // },
        // {
        //     name: 'mean',
        //     fn: math.mean,
        //     weight: 1
        // }
    ];

    // determines if the endpoint is within a band of the shape
    // used as a bounder
    var bander = function(options)
    {
        var fn = R.curry(function(band, distance, maxDistance)
        {
            var x;

            if (math.abs(distance - maxDistance) < band)
            {
                x = (distance - maxDistance) % 1;
            }
            else
            {
                x = 0;
            }

            return x;
        });

        var band = Rp.bandom(options.maxDistance, 2);

        return {
            name: "band",
            band: band,
            fn: fn(band)
        };
    };

    var bounders = [
        {
            fn: function()
            {
                return {
                    name: "inside",
                    fn: function(distance, maxDistance)
                    {
                        return (distance < maxDistance ? (distance - maxDistance) % 1 : 0);
                    }
                };
            },
            weight: 1,
        },

        {
            fn: function()
            {
                return {
                    name: "outside",
                    fn: function(distance, maxDistance)
                    {
                        return (distance > maxDistance ? (distance - maxDistance) % 1 : 0);
                    }
                };
            },
            weight: 1,
        },
        {
            fn: bander,
            weight: 4
        }
    ];

    var adjx = function(x, adj)
    {
        x += adj;

        if (x < -1)
        {
            x = 2 + x;
        }
        else if (x > 1)
        {
            x = -2 + x;
        }

        return x;
    };

    var normalize = function(vals)
    {
        var max = math.max(R.map(math.abs, vals));

        return math.divide(vals, max);
    };

    var distancers = [
        {
            fn: function()
            {
                return {
                    name: "edge",
                    fn: function(z /*, lines*/ )
                    {
                        return math.min(z.re, z.im);
                    }
                };
            },
            weight: 1,
        },
        {
            fn: function()
            {
                return {
                    name: "edges",
                    fn: function(z, lines)
                    {
                        return math.min(z.re, z.im, 1 / lines - z.re, 1 / lines - z.im);
                    }
                };
            },
            weight: 1,
        },
        {
            fn: function()
            {
                return {
                    name: "point",
                    fn: function(z, lines)
                    {
                        return math.sqrt(math.norm(math.subtract(z, math.complex(0.5 / lines, 0.5 / lines))));
                    }
                };
            },
            weight: 1,
        },

    ];

    exports.modifiers = [
        {
            // final angle

            fn: function(functal)
            {
                var fn = R.curry(function(point, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, point);

                        var x = math.atan2(z1.re, z1.im) / math.pi;

                        return x;
                    }, result.zs);

                    return vals;
                });

                var point = math.complex(math.random(-functal.limit, functal.limit), math.random(-functal.limit, functal.limit));

                return {
                    fn: fn(point),
                    params:
                    {
                        name: 'angle',
                        point: point
                    }
                };
            },
            weight: 1,
        },
        {
            fn: function(functal)
            {
                var fn = R.curry(function(offset, functal, result)
                {
                    // just z.re

                    var vals = R.map(function(z)
                    {
                        return z.re + offset;
                    }, result.zs);

                    return normalize(vals);

                });

                var offset = math.random(-functal.limit, functal.limit);

                return {
                    fn: fn(offset),
                    params:
                    {
                        name: 'real',
                        offset: offset
                    }
                };
            },
            weight: 1,
        },

        {
            fn: function( /* functal */ )
            {
                var fn = R.curry(function(phase, functal, result)
                {
                    // normalized z.re

                    var max = math.max(R.map(function(z)
                    {
                        return math.abs(z.re);
                    }, result.zs));

                    var vals = R.map(function(z)
                    {
                        return adjx(max ? z.re / max : 1, offset);
                    }, result.zs);

                    return vals;
                });

                var offset = math.random(-1, 1);

                return {
                    fn: fn(offset),
                    params:
                    {
                        name: 'real',
                        offset: offset
                    }
                };
            },
            weight: 1,
        },

        {
            // norm
            fn: function( /* functal */ )
            {
                var fn = R.curry(function(phase, functal, result)
                {

                    var vals = R.map(function(z)
                    {
                        var x = functal.finite(math.norm(z)) / functal.limit;

                        return adjx(x, offset);
                    }, result.zs);

                    return vals;
                });

                var offset = math.random(-1, 1);

                return {
                    fn: fn(offset),
                    params:
                    {
                        name: 'norm',
                        offset: offset
                    }
                };
            },
            weight: 1,
        },

        {
            // point trap

            fn: function(functal)
            {
                var fn = R.curry(function pointTrap(point, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, point);

                        var distance = math.sqrt(functal.finite(math.norm(z1)));

                        return distance;
                    }, result.zs);

                    return normalize(vals);
                });

                var point = math.complex(math.random(-functal.limit, functal.limit), math.random(-functal.limit, functal.limit));

                // return curried function with constant params
                return {
                    fn: fn(point),
                    params:
                    {
                        name: 'pointTrap',
                        point: point
                    }
                };
            },
            weight: 0.5,
        },

        {
            // vertical line trap

            fn: function(functal)
            {
                var fn = R.curry(function pointTrap(x, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var distance = math.abs(z.re - x);

                        return distance;
                    }, result.zs);

                    return normalize(vals);

                });

                var x = math.random(-functal.limit, functal.limit);

                return {
                    fn: fn(x),
                    params:
                    {
                        name: 'vertical line trap',
                        x: x
                    }
                };
            },
            weight: 1,
        },

        {
            // horizontal line trap

            fn: function(functal)
            {
                var fn = R.curry(function pointTrap(y, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var distance = math.abs(z.im - y);

                        return distance;
                    }, result.zs);

                    return normalize(vals);
                });

                var y = math.random(-functal.limit, functal.limit);

                return {
                    fn: fn(y),
                    params:
                    {
                        name: 'horizontal line trap',
                        y: y
                    }
                };
            },
            weight: 1,
        },

        {
            // grid trap
            // closest line to in a square grid

            fn: function( /* functal */ )
            {
                var fn = R.curry(function gridTrap(lines, isCheckered, distancer, border, bounder, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.multiply(z, lines);
                        var z2 = math.floor(z1);
                        var z3;

                        if (isCheckered && z2.re % 2 !== z2.im % 2)
                        {
                            z3 = z2;
                        }
                        else
                        {
                            z3 = math.subtract(z1, z2);
                        }

                        var z4 = math.divide(z3, lines);

                        var distance = distancer.fn(z4, lines);

                        return bounder.fn(distance, border);

                    }, result.zs);

                    return normalize(vals);
                });

                var lines = 1 + Rp.bandomInt(4, 1);

                var isCheckered = !!math.randomInt(2);

                var distancer = Rp.wandom(distancers).fn(
                {});

                var border = math.random(1) / lines;

                var bounder = Rp.wandom(bounders).fn(
                {
                    maxDistance: border
                });

                return {
                    fn: fn(lines, isCheckered, distancer, border, bounder),
                    params:
                    {
                        name: 'grid trap',
                        lines: lines,
                        isCheckered: isCheckered,
                        distancer: distancer,
                        border: border,
                        bounder: bounder
                    }
                };
            },
            weight: 2,
        },

        {
            // box trap

            fn: function( /* functal */ )
            {
                var fn = R.curry(function boxTrap(bounder, size, centre, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        var x = math.abs(z1.re);
                        var y = math.abs(z1.im);

                        // furthest dimension from centre
                        var distance = math.max(x, y);

                        return bounder.fn(distance, size);

                    }, result.zs);

                    return normalize(vals);

                });

                var size = Rp.bandom(1, -2);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());
                var bounder = Rp.wandom(bounders).fn(
                {
                    maxDistance: size
                });

                return {
                    fn: fn(bounder, size, centre),
                    params:
                    {
                        name: 'boxTrap',
                        size: size,
                        centre: centre,
                        bounder: bounder
                    }

                };
            },
            weight: 2,
        },
        {
            // sin

            fn: function( /* functal */ )
            {
                var fn = R.curry(function sinTrap(diameter, centre, ampl, freq, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        return z.im + ampl * math.sin(freq * z.re);

                    }, result.zs);

                    return normalize(vals);
                });

                var diameter = Rp.bandom(1, -2);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());
                var freq = Rp.bandom(2, 4);
                var ampl = math.random(0.5);

                return {
                    fn: fn(diameter, centre, freq, ampl),
                    params:
                    {
                        name: 'sin',
                        diameter: diameter,
                        centre: centre,
                        freq: freq,
                        ampl: ampl
                    }
                };
            },
            weight: 1,
        },
        {
            // real + a * imag - b

            name: 'linear',
            fn: function(functal)
            {
                var fn = R.curry(function reimTrap(a, b, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var y = functal.finite(z.im + a * z.re - b);

                        return y;

                    }, result.zs);

                    return normalize(vals);

                });

                var a = math.random(-functal.limit, functal.limit);
                var b = math.random(-functal.limit, functal.limit);

                return {
                    fn: fn(a, b),
                    params:
                    {
                        name: 'linear',
                        a: a,
                        b: b
                    }

                };
            },
            weight: 0.5,
        },
        {
            // real * imag

            name: 'rebyim',
            fn: function( /* functal */ )
            {
                var fn = R.curry(function reimTrap(offset, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var y = functal.finite(z.im * z.re) - offset;

                        return y;

                    }, result.zs);

                    return normalize(vals);

                });

                var offset = Rp.bandom(1, -2);

                return {
                    fn: fn(offset),
                    params:
                    {
                        name: 'rebyim',
                        offset: offset
                    }

                };
            },
            weight: 1,
        },

        {
            // circle trap

            fn: function(functal)
            {
                var fn = R.curry(function circleTrap(bounder, diameter, centre, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        var distance = math.sqrt(functal.finite(math.norm(z1)));

                        return bounder.fn(distance, diameter);

                    }, result.zs);

                    return vals;
                });

                var diameter = Rp.bandom(functal.limit, -2);
                var centre = math.complex(math.random(-functal.limit, functal.limit), math.random(-functal.limit, functal.limit));
                var bounder = Rp.wandom(bounders).fn(
                {
                    maxDistance: diameter
                });

                // return curried function with constant params
                return {
                    fn: fn(bounder, diameter, centre),
                    params:
                    {
                        name: 'circleTrap',
                        centre: centre,
                        diameter: diameter,
                        bounder: bounder
                    }
                };
            },
            weight: 2,
        },


        {
            // spiral trap

            name: 'spiral trap',
            fn: function(functal)
            {
                var fn = R.curry(function spiralTrap(bounder, diameter, freq, spirality, functal, result)
                {
                    var pi2 = math.pi * 2;
                    var d2 = diameter / pi2;
                    var maxGap = diameter / 2;

                    var vals = R.map(function(z)
                    {
                        var rz = math.norm(z);

                        var theta = math.atan2(z.im, z.re); // -pi .. pi
                        var thetaSpirality = theta * spirality;

                        var minDistance = Number.MAX_VALUE;

                        for (var f = 0; f < freq; f++)
                        {
                            var r = (thetaSpirality + f * pi2) * d2;

                            var distance = math.abs(r - rz);

                            minDistance = math.min(distance, minDistance);

                            if (minDistance < maxGap)
                            {
                                break;
                            }
                        }

                        return bounder.fn(minDistance, diameter);

                    }, result.zs);

                    return normalize(vals);
                });

                var freq = 1 + Rp.bandomInt(50, 3);
                var maxDiameter = Rp.bandom(functal.limit, 1);
                var diameter = maxDiameter / freq;
                var spirality = math.randomInt(2); // 0 = concentric circles, 1 = spiral

                var bounder = Rp.wandom(bounders).fn(
                {
                    maxDistance: diameter
                });

                return {
                    fn: fn(bounder, diameter, freq, spirality),
                    params:
                    {
                        name: 'spiral trap',
                        diameter: diameter,
                        freq: freq,
                        spirality: spirality,
                        bounder: bounder
                    }

                };
            },
            weight: 4,
        },

        {
            // polygon trap

            fn: function(functal)
            {
                var fn = R.curry(function polygonTrap(lines, border, bounder, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var distance = R.reduceIndexed(function(min, line, k)
                        {
                            var p1 = line;
                            var p2 = lines[math.mod(k + 1, lines.length)];

                            var x1 = p1.x;
                            var y1 = p1.y;
                            var x2 = p2.x;
                            var y2 = p2.y;
                            var x0 = z.re;
                            var y0 = z.im;

                            var dist = math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) /
                                math.sqrt(math.pow(y2 - y1, 2) + math.pow(x2 - x1, 2));

                            min = math.min(min, dist);

                            return min;

                        }, Number.MAX_VALUE, lines);

                        // return bounder.fn(distance, border);

                        return distance;

                    }, result.zs);

                    return normalize(vals);
                });

                // create polygon

                var centre = {
                    x: 0,
                    y: 0
                };
                var points = 3 + Rp.bandomInt(6, 2);
                var radius1 = math.random(0, functal.limit);
                var radius2 = radius1; //math.random(0, functal.limit);

                var lines = [];

                for (var p = 0; p < points; p++)
                {
                    var x = centre.x + radius1 * math.cos(math.pi * 2 / points * p);
                    var y = centre.y + radius2 * math.sin(math.pi * 2 / points * p);

                    // Rotate(pt, fAngle);

                    lines.push(
                    {
                        x: x,
                        y: y
                    });
                }

                var border = math.random(1) / lines;

                var bounder = Rp.wandom(bounders).fn(
                {
                    maxDistance: functal.limit
                });

                return {
                    fn: fn(lines, border, bounder),
                    params:
                    {
                        name: 'polygon trap',
                        lines: lines,
                        sides: lines.length,
                        border: border,
                        bounder: bounder
                    }
                };
            },
            weight: 2,
        },

    ];
}());
