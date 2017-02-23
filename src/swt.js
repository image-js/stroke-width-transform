"use strict";

var Image = require("image-js");
const MAX_BRIGHTNESS = 255;

/*function gaussianFilter(image, width, height, sigma) {
    var n = 2 * Math.floor(2 * sigma) + 3;
    var mean = Math.floor(n / 2.0);
    var kernel = new Array(n * n); // variable length array

    //fprintf(stderr, "gaussian_filter: kernel size %d, sigma=%g\n",
    //    n, sigma);
    var c = 0;
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
            kernel[c] = Math.exp(-0.5 * (Math.pow((i - mean) / sigma, 2.0) +
                    Math.pow((j - mean) / sigma, 2.0)))
                / (2 * Math.PI * sigma * sigma);
            c++;
        }
    }

    return convolution(image, kernel, width, height, n, true);
}

function convolution(image, kernel, width, height, kn, normalize) {
    var out = new Array(width * height);
    const khalf = Math.floor(kn / 2);
    var min = Number.MAX_VALUE, max = -Number.MAX_VALUE;

    if(normalize) {
        for(var m = khalf; m < width - khalf; m++) {
            for(var n = khalf; n < height - khalf; n++) {
                var pixel = 0.0, c = 0;
                for (var j = -khalf; j <= khalf; j++) {
                    for (var i = -khalf; i <= khalf; i++) {
                        pixel += image[(n - j) * width + m - i] * kernel[c];
                        c++;
                    }
                    if (pixel < min) {
                        min = pixel;
                    }
                    if (pixel > max) {
                        max = pixel;
                    }
                }
            }
        }
    }

    for (m = khalf; m < width - khalf; m++) {
        for (n = khalf; n < height - khalf; n++) {
            pixel = 0.0;
            c = 0;
            for (j = -khalf; j <= khalf; j++) {
                for (i = -khalf; i <= khalf; i++) {
                    pixel += image[(n - j) * width + m - i] * kernel[c];
                    c++;
                }

                if (normalize)
                    pixel = MAX_BRIGHTNESS * (pixel - min) / (max - min);
                out[n * width + m] = pixel;
            }
        }
    }

    return out;
}*/

function canny(image, options) {
    var width = image.width, height = image.height;

    options = options | {};
    var tMin = options.lowThreshold | 35;
    var tMax = options.highThreshold | 75;
    var blur = options.blur | 1;

    var Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    var Gy = [[1, 2, 1], [0, 0, 0], [-1, -2, 1]];

    var gf = image.gaussianFilter({
        sigma: blur,
        radius: 3
    });

    var gradientX = gf.convolution(Gx);
    var gradientY = gf.convolution(Gy);
    var G = new Array(width * height);

    for(var i = 1; i < width - 1; i++) {
        for(var j = 1; j < height - 1; j++) {
            c = i + width * j;
            G[c] = Math.floor(Math.hypot(gradientX.getPixel(c)[0], gradientY.getPixel(c)[0]));
        }
    }

    var nms = new Array(width * height);
    var edges = new Array(width * height);
    for(i = 0; i < nms.length; ++i) {
        nms[i] = 0;
        edges[i] = 0;
    }

    var output = new Image(width, height).grey();
    // non-maximum supression
    for (i = 1; i < width - 1; i++) {
        for (j = 1; j < height - 1; j++) {
            var c = i + width * j;
            var nn = c - width;
            var ss = c + width;
            var ww = c + 1;
            var ee = c - 1;
            var nw = nn + 1;
            var ne = nn - 1;
            var sw = ss + 1;
            var se = ss - 1;

            var dir = Math.floor(((Math.atan2(gradientY.getPixel(c)[0], gradientX.getPixel(c)[0]) + Math.PI) % Math.PI) / Math.PI) * 8;

            if (((dir <= 1 || dir > 7) && G[c] > G[ee] &&
                G[c] > G[ww]) || // 0 deg
                ((dir > 1 && dir <= 3) && G[c] > G[nw] &&
                G[c] > G[se]) || // 45 deg
                ((dir > 3 && dir <= 5) && G[c] > G[nn] &&
                G[c] > G[ss]) || // 90 deg
                ((dir > 5 && dir <= 7) && G[c] > G[ne] &&
                G[c] > G[sw]))   // 135 deg
                nms[c] = G[c];
            else
                nms[c] = 0;
        }
    }

    var c = 1;
    for (j = 1; j < height - 1; j++) {
        for (i = 1; i < width - 1; i++) {
            if (nms[c] >= tMax && output.getPixel(c)[0] === 0) { // trace edges
                output.setPixel(c, [MAX_BRIGHTNESS]);
                var nedges = 1;
                edges[0] = c;

                do {
                    nedges--;
                    var t = edges[nedges];

                    var nbs = new Array(8); // neighbours
                    nbs[0] = t - width;     // nn
                    nbs[1] = t + width;     // ss
                    nbs[2] = t + 1;      // ww
                    nbs[3] = t - 1;      // ee
                    nbs[4] = nbs[0] + 1; // nw
                    nbs[5] = nbs[0] - 1; // ne
                    nbs[6] = nbs[1] + 1; // sw
                    nbs[7] = nbs[1] - 1; // se

                    for(var k = 0; k < 8; k++) {
                        if (nms[nbs[k]] >= tMin && output.getPixel(nbs[k])[0] === 0) {
                            output.setPixel(nbs[k], [MAX_BRIGHTNESS]);
                            edges[nedges] = nbs[k];
                            nedges++;
                        }
                    }
                } while (nedges > 0);
            }
            c++;
        }
    }

    return output;
}

Image.load("./img/billboard.jpg").then(function(image) {
    var grey = image.grey();
    grey = canny(grey);
    grey.save("test.jpg");
});
