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
            fn: function(options)
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
            },
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
                var fn = R.curry(function circleTrap(diameter, centre, functal, result)
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
                    fn: fn(diameter, centre),
                    params:
                    {
                        name: 'circleTrap',
                        diameter: diameter,
                        centre: centre,
                        bounder: bounder
                    }
                };
            },
            weight: 1000000,
        },
        {
            // box trap

            fn: function( /* functal */ )
            {
                var fn = R.curry(function boxTrap(diameter, centre, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        var x = math.abs(z1.re);
                        var y = math.abs(z1.im);

                        var dist = math.max(x, y);

                        return math.mod(dist - diameter, 1);

                    }, result.zs);

                    return normalize(vals);

                });

                var diameter = Rp.bandom(1, -2);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());

                return {
                    fn: fn(diameter, centre),
                    params:
                    {
                        name: 'boxTrap',
                        diameter: diameter,
                        centre: centre
                    }

                };
            },
            weight: 2,
        },
        {
            // sin trap

            fn: function( /* functal */ )
            {
                var fn = R.curry(function sinTrap(diameter, centre, ampl, freq, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        return z1.im + ampl * math.sin(freq * z1.re) - diameter;


                    }, result.zs);

                    var max = math.max(R.map(math.abs, vals));

                    return math.divide(vals, max);
                });

                var diameter = Rp.bandom(1, -2);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());
                var freq = Rp.bandom(2, 4);
                var ampl = math.random(0.5);

                return {
                    fn: fn(diameter, centre, freq, ampl),
                    params:
                    {
                        name: 'sinTrap',
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
            // real imag trap

            name: 'reimTrap',
            fn: function( /* functal */ )
            {
                var fn = R.curry(function reimTrap(diameter, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var y = functal.finite(z.im * z.re) - diameter;

                        return y;

                    }, result.zs);

                    return normalize(vals);

                });

                var diameter = Rp.bandom(1, -2);

                return {
                    fn: fn(diameter),
                    params:
                    {
                        name: 'reimTrap',
                        diameter: diameter
                    }

                };
            },
            weight: 1,
        },
        {
            // spiral trap

            name: 'spiralTrap',
            fn: function( /* functal */ )
            {
                var fn = R.curry(function spiralTrap(freq, diameter, centre, functal, result)
                {
                    var vals = R.map(function(z)
                    {
                        var z1 = math.subtract(z, centre);

                        var theta = math.atan2(z1.re, z1.im); // -pi .. pi

                        var ctheta = math.cos(theta);
                        var stheta = math.sin(theta);

                        theta = theta + math.pi; // 0..2pi

                        var minDist = 1e6;

                        var pi2 = 2.0 * math.pi;
                        var f = 1.0 / (math.pi * freq) * diameter; // factor to convert theta to a radius from 0..diam

                        // find the closest point in the spiral

                        for (var j = 0; j < freq; j++)
                        {
                            var theta2 = theta + j * pi2;

                            var r = theta2 * f;

                            var x = r * ctheta;
                            var y = r * stheta;

                            var dist = math.sqrt(math.square(x - z1.re) + math.square(y - z1.im));

                            minDist = math.min(dist, minDist);
                        }

                        return minDist;

                    }, result.zs);

                    return normalize(vals);
                });

                var freq = math.randomInt(1, 11);
                var diameter = Rp.bandom(1, -2);
                var centre = math.complex(Rp.bandom(1, 2) * Rp.randomSign() - 1, Rp.bandom(1, 2) * Rp.randomSign());

                return {
                    fn: fn(freq, diameter, centre),
                    params:
                    {
                        name: 'spiralTrap',
                        freq: freq,
                        diameter: diameter,
                        centre: centre
                    }

                };
            },
            weight: 1,
        },
    ];
}());
