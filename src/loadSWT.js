import Matrix from 'ml-matrix';

const defaultOptions = {
  interval: 1,
  minNeighbors: 1,
  scaleInvariant: true,
  direction: 0,
  sameWordThresh: [0.1, 0.8],
  size: 3,
  lowThresh: 124,
  highThresh: 204,
  maxHeight: 300,
  minHeight: 8,
  minArea: 38,
  letterOccludeThresh: 3,
  aspectRatio: 8,
  stdRatio: 0.83,
  thicknessRatio: 1.5,
  heightRatio: 1.7,
  intensityThresh: 31,
  distanceRatio: 2.9,
  intersectRatio: 1.3,
  elongateRatio: 1.9,
  letterThresh: 3,
  breakdown: 1,
  breakdownRatio: 1
};

export default function loadSWT(CCVLib) {

  /**
   * Get the bounding boxes over the text from the image using stroke width transform (SWT)
   * @param {Image} image
   * @param {object} options
   * @param {boolean} [options.scaleInvariant=true] - Enable scale invariant SWT (to scale to different sizes and then combine the results)
   * @param {number} [options.interval=1] - Intervals for the scale invariant option
   * @param {number} [options.minNeighbors=1] - Minimal neighbors to make a detection valid, this is for scale-invariant version.
   * @param {Array<number>[2]} [options.sameWordThresh=[0.1, 0.8]] - Overlapping more than 0.1 of the bigger one (0), and 0.9 of the smaller one (1)
   * @param {number} [options.size=3] - Size of the sobel operator for Canny Edge.
   * @param {number} [options.lowThresh=124] - Low threshold for  Canny Edge.
   * @param {number} [options.highThresh=204] - High threshold for Canny Edge.
   * @param {number} [options.maxHeight=300] - Maximum height for a letter.
   * @param {number} [options.minHeight=8] - Minimum height for a letter.
   * @param {number} [options.minArea=38] - Minimum occupied area for a letter.
   * @param {number} [options.aspectRatio=8] - Maximum aspect ratio for a letter.
   * @param {number} [options.stdRatio=0.83] - The inner-class standard derivation when grouping letters.
   * @param {number} [options.thicknessRatio=1.5] - The allowable thickness variance when grouping letters.
   * @param {number} [options.heightRatio=1.7] - The allowable height variance when grouping letters.
   * @param {number} [options.intensityThresh=31] - The allowable intensity variance when grouping letters.
   * @param {number} [options.distanceRatio=2.9] - The allowable distance variance when grouping letters.
   * @param {number} [options.intersectRatio=1.3] - The allowable intersect variance when grouping letters.
   * @param {number} [options.elongateRatio=1.9] - The allowable elongate variance when grouping letters.
   * @param {number} [options.letterThresh=3] - The allowable letter threshold.
   * @param {boolean} [options.breakdown=true] - If breakdown text line into words.
   * @param {number} [options.breakdownRatio=1] - Apply OTSU method and if inter-class variance above the threshold, it will be break down into words.
   *
   * @return {Array<Roi>} - Array of regions that contains text.
   */
  function strokeWidthTransform(image, options) {
    options = Object.assign({}, defaultOptions, options);

    var imageData = {
      width: image.width,
      height: image.height,
      data: image.getRGBAData()
    };

    const denseMatrix = new CCVLib.ccv_dense_matrix_t();
    CCVLib.ccv_read(imageData, denseMatrix);
    const rects = CCVLib.ccv_swt_detect_words(denseMatrix, options);

    var output = rects.toJS();

    denseMatrix.delete();
    rects.delete();

    return getRois(image, output);
  }

  function getRois(image, rects) {
    const manager = image.getRoiManager();
    var map = Matrix.zeros(image.height, image.width);
    for (var i = 0; i < rects.length; ++i) {
      var {
        x,
        y,
        width,
        height
      } = rects[i];

      var id = i + 1;
      fill(map, x, y, width, height, id);
    }

    manager.putMap(map.to1DArray());
    return manager.getRois({
      positive: true,
      negative: false
    });

  }

  function fill(array, x, y, width, height, toFill) {
    for (var i = x; i <= x + width; ++i) {
      for (var j = y; j <= y + height; ++j) {
        if (array[j][i] !== 0) {
          continue;
        }
        array[j][i] = toFill;
      }
    }
  }

  return strokeWidthTransform;
}
