"use strict";

var Image = require("image-js");

function canny(image, options) {
    options = options | {};
    var sigma = options.sigma | 0.2;
    var tMin = options.lowThreshold | 50;
    var tMax = options.highThreshold | 150;
    var blur = options.blur | 1;
    const MAX_BRIGHTNESS = 255;

    var width = image.width, height = image.height;

    var Gx = [[-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]];
    var Gy = [[1, 2, 1],
        [0, 0, 0],
        [-1, -2, 1]];

    var gf = image.gaussianFilter({
        sigma: sigma
    });

    var gradientX = image.convolution(Gx);
    gradientX.save("gradientx.jpg");
    var gradientY = image.convolution(Gy);
    gradientY.save("gradienty.jpg");
    var G = image.sobelFilter({
        kernelX: Gx,
        kernelY: Gy
    });

    var nms = new Array(width * height);
    var edges = new Array(width * height);
    for(var i = 0; i < nms.length; ++i) {
        nms[i] = 0;
        edges[i] = 0;
    }

    var output = new Image(width, height).grey();

    // non-maximum supression
    for (i = 1; i < width - 1; i++) {
        for (var j = 1; j < height - 1; j++) {
            var c = i + width * j;
            var nn = c - width;
            var ss = c + width;
            var ww = c + 1;
            var ee = c - 1;
            var nw = nn + 1;
            var ne = nn - 1;
            var sw = ss + 1;
            var se = ss - 1;

            var dir = (Math.atan2(gradientY.getPixelXY(i, j)[0] % gradientX.getPixelXY(i, j)[0]
                    + Math.PI, Math.PI) / Math.PI) * 8;

            if (((dir <= 1 || dir > 7) && G.getPixel(c) > G.getPixel(ee) &&
                G.getPixel(c) > G.getPixel(ww)) || // 0 deg
                ((dir > 1 && dir <= 3) && G.getPixel(c) > G.getPixel(nw) &&
                G.getPixel(c) > G.getPixel(se)) || // 45 deg
                ((dir > 3 && dir <= 5) && G.getPixel(c) > G.getPixel(nn) &&
                G.getPixel(c) > G.getPixel(ss)) || // 90 deg
                ((dir > 5 && dir <= 7) && G.getPixel(c) > G.getPixel(ne) &&
                G.getPixel(c) > G.getPixel(sw)))   // 135 deg
                nms[c] = G.getPixel(c);
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
    grey = grey.sobelFilter();
    grey = canny(grey);
    grey.save("test.jpg");
});
