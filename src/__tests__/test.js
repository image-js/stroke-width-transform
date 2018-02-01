import strokeWidthTransform from '..';
import {Image} from 'image-js';

describe('test Stroke Width Transform', () => {
  test('main test', async () => {
      var images = [Image.load('example/sample.jpg'), Image.load('example/sample-output.jpg')]
      await Promise.all(images).then(function (images) {
        var rois = strokeWidthTransform(images[0], {
          scale_invariant: 1,
        });
        var paintedImage = drawRois(images[0], rois);

        expect(paintedImage.getRGBAData()).toEqual(images[1].getRGBAData());
    });
  });
});

function drawRois(image, rois) {

  rois.forEach(function (roi) {
    var small = roi.getMask()
    roi.data = Array.from(small.data);

    // draw bounding boxes
    var mask = roi.getMask();
    var mbr = mask.minimalBoundingRectangle();
    roi.mbr = mbr;
    roi.mbrWidth = getDistance(mbr[0], mbr[1]);
    roi.mbrHeight = getDistance(mbr[1], mbr[2]);
    roi.mbrSurface = roi.mbrWidth * roi.mbrHeight;
    roi.fillingFactor = roi.surface / roi.mbrSurface;
    
    mbr = mbr.map(point =>
        [
            point[0] + mask.position[0],
            point[1] + mask.position[1]
        ]
    );
    image.paintPolyline(mbr, {color: [255, 0, 0]});
  });

  return image;
}

function getDistance(p1, p2) {
  return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
}