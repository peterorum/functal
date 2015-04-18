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

    exports.modifiers = [
        {
            fn: function( /* functal */ )
            {
                var fn = R.curry(function(phase, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var x = adjx(math.atan2(z.re, z.im) / math.pi, phase);

                        return x;
                    }, result.zs);

                    return vals;
                });

                var phase = math.random(-1, 1);

                return {
                    fn: fn(phase),
                    params:
                    {
                        name: 'angle',
                        phase: phase
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
                    var vals = R.mapIndexed(function(z, i, zs)
                    {
                        var x = 0;

                        if (i > 0)
                        {
                            var z1 = zs[i - 1];
                            var z2 = math.subtract(zs[i], z1);

                            x = math.atan2(z2.re, z2.im) / math.pi;
                        }

                        x = adjx(x, phase);

                        return x;

                    }, result.zs);

                    return vals;
                });

                var phase = math.random(-1, 1);

                return {
                    fn: fn(phase),
                    params:
                    {
                        name: 'angleChange',
                        phase: phase
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
                var fn = R.curry(function gridTrap(lines, functal, result)
                {
                    var range = functal.limit;

                    var vals = R.map(function(z)
                    {
                        var horizontalDistances = R.times(function(i)
                        {
                            return math.abs(z.im - range * (-1 + 2 / lines * i));
                        }, lines + 1);

                        var verticalDistances = R.times(function(i)
                        {
                            return math.abs(z.re - range * (-1 + 2 / lines * i));
                        }, lines + 1);

                        var distance = math.min(R.reduce(math.min, 1e6, horizontalDistances), R.reduce(math.min, 1e6, verticalDistances));

                        return distance;
                    }, result.zs);

                    return normalize(vals);
                });

                var lines = math.randomInt(1, 10);

                return {
                    fn: fn(lines),
                    params:
                    {
                        name: 'grid trap',
                        lines: lines
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
                        diameter: diameter,
                        centre: centre,
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
            // spiral trap

            name: 'spiralTrap',
            fn: function(functal)
            {
                var fn = R.curry(function spiralTrap(bounder, freq, diameter, centre, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        var theta = math.atan2(z1.re, z1.im); // -pi .. pi

                        var ctheta = math.cos(theta);
                        var stheta = math.sin(theta);

                        theta = theta + math.pi; // 0..2pi

                        var minDistance = Number.MAX_VALUE;

                        var pi2 = 2.0 * math.pi;
                        var f = 1.0 / (math.pi * freq) * diameter; // factor to convert theta to a radius from 0..diameter

                        // find the closest point in the spiral

                        var spiralDistance = 0;

                        for (var j = 0; j < freq; j++)
                        {
                            var theta2 = theta + j * pi2;

                            var r = theta2 * f;

                            var x = r * ctheta;
                            var y = r * stheta;

                            var dist = math.sqrt(math.square(x - z1.re) + math.square(y - z1.im));

                            if (dist < minDistance)
                            {
                                minDistance = dist;
                                spiralDistance = math.sqrt(math.square(x) + math.square(y));
                            }
                        }

                        return spiralDistance;

                        // return bounder.fn(spiralDistance, 0);

                    }, result.zs);

                    return normalize(vals);
                });

                var freq = 1 + Rp.bandomInt(20, -2);
                var diameter = Rp.bandom(functal.limit, -2);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());
                // var bounder = bander({maxDistance: diameter / freq});
                var bounder = bounders[2].fn(
                {
                    maxDistance: diameter / freq
                });

                return {
                    fn: fn(bounder, freq, diameter, centre),
                    params:
                    {
                        name: 'spiralTrap',
                        freq: freq,
                        diameter: diameter,
                        centre: centre,
                        bounder: bounder
                    }

                };
            },
            weight: 1,
        },
    ];
}());
