"use strict";

var Image = require("image-js");
var Matrix = require("ml-matrix");
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

function nmsHist(width, height, gradientY, gradientX, G, tMax, tMin) {

}

function canny(image, options) {
    var width = image.width, height = image.height;

    options = options | {};
    var tMin = options.lowThreshold | 40;
    var tMax = options.highThreshold | 120;
    var blur = options.blur | 1.5;

    var Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    var Gy = [[1, 2, 1], [0, 0, 0], [-1, -2, -1]];

    var gfOptions = {
        sigma: 1,
        radius: 2
    };

    var gf = image.gaussianFilter(gfOptions);

    var convOptions = {
        bitDepth: 32,
        mode: 'periodic'
    };

    var gradientX = gf.convolution(Gx, convOptions);
    var gradientY = gf.convolution(Gy, convOptions);
    //gradientX.save("gradientX.jpg");
    //gradientY.save("gradientY.jpg");

    var G = new Array(width * height);
    for (var i = 0; i < width; i++) {
        for (var j = 0; j < height; j++) {
            var c = i + width * j;
            // G[c] = abs(after_Gx[c]) + abs(after_Gy[c]);
            G[c] = Math.hypot(gradientY.getPixel(c)[0], gradientX.getPixel(c)[0]);
        }
    }


    var nms = new Array(width * height);
    var edges = new Array(width * height);
    var finalImage = new Array(width * height);
    for (i = 0; i < nms.length; ++i) {
        nms[i] = 0;
        edges[i] = 0;
        finalImage[i] = 0;
    }

    var to1D = function (x, y) {
        return x * height + y;
    };

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

            var dir = (Math.round(Math.atan2(gradientY.getPixel(c)[0], gradientX.getPixel(c)[0]) * (5.0 / Math.PI)) + 5) % 5;
            dir %= 4;

            if (
                !((dir === 0 && (G[to1D(i, j)] <= G[to1D(i, j - 1)] || G[to1D(i, j) <= G[to1D(i, j + 1)]]))
                || (dir === 1 && (G[to1D(i, j)] <= G[to1D(i - 1, j + 1)] || G[to1D(i, j) <= G[to1D(i + 1, j - 1)]]))
                || (dir === 2 && (G[to1D(i, j)] <= G[to1D(i - 1, j)] || G[to1D(i, j) <= G[to1D(i + 1, j)]]))
                || (dir === 3 && (G[to1D(i, j)] <= G[to1D(i - 1, j - 1)] || G[to1D(i, j) <= G[to1D(i + 1, j + 1)]])))
            ) {
                nms[to1D(i, j)] = G[to1D(i, j)]
            }
        }
    }


    var counter = 0;
    for (i = 0; i < nms.length; ++i) {
        counter += nms[i] !== 0 ? 1 : 0;
        if (nms[i] > tMax) {
            edges[i] += 1;
            finalImage[i] = MAX_BRIGHTNESS;
        }
        if (nms[i] > tMin) {
            edges[i] += 1;
        }
    }

    var currentPixels = [];
    for (i = 1; i < width - 1; ++i) {
        for (j = 1; j < height - 1; ++j) {
            if (edges[to1D(i, j)] !== 1) {
                continue;
            }

            var end = false;
            for (var k = i - 1; k < i + 2; ++k) {
                for (var l = j - 1; l < j + 2; ++l) {
                    if (edges[to1D(k, l)] === 2) {
                        currentPixels.push([i, j]);
                        finalImage[to1D(i, j)] = MAX_BRIGHTNESS;
                        end = true;
                        break;
                    }
                }
                if (end) {
                    break;
                }
            }
        }
    }

    while (currentPixels.length > 0) {
        var newPixels = [];
        for (i = 0; i < currentPixels.length; ++i) {
            for (j = -1; j < 2; ++j) {
                for (k = -1; k < 2; ++k) {
                    if (j === 0 && k === 0) {
                        continue;
                    }
                    var row = currentPixels[i][0] + j;
                    var col = currentPixels[i][1] + k;
                    var index = to1D(row, col);
                    if (edges[index] === 1 && finalImage[index] === 0) {
                        newPixels.push([row, col]);
                        finalImage[index] = MAX_BRIGHTNESS;
                    }
                }
            }
        }
        currentPixels = newPixels;
    }

    var output = image.clone();
    for (i = 0; i < finalImage.length; ++i) {
        output.setPixel(i, [finalImage[i]]);
    }

    return output;
}

Image.load("./img/billboard.jpg").then(function(image) {
    var grey = image.grey({
        algorithm: 'luma601'
    });

/*    var testImage = new Image(4, 4).grey();
    testImage.setMatrix(new Matrix([[1, 2, 0, 0],
        [5, 3, 0, 4],
        [0, 0, 0, 7],
        [9, 3, 0, 0]]));*/

    grey = canny(grey);
    grey.save("test.jpg");
}).catch(function (result) {
    console.log(result);
});
