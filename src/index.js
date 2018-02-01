import CCV from '../dist/ccv';
import Image from 'image-js';
import Matrix from 'ml-matrix';
const CCVLib = CCV({});

export default function strokeWidthTransform(image, options) {
  options = Object.assign({}, CCVLib.ccv_swt_default_params, options);

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
  var map = Matrix.zeros(image.height, image.width);//new Array(image.width * image.height).fill(0);
  //var replace = {};
  for(var i = 0; i < rects.length; ++i) {
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
  for(var i = x; i <= x + width; ++i) {
    for(var j = y; j <= y + height; ++j) {
      if(array[j][i] !== 0) {
        continue;
      }
      array[j][i] = toFill;
    }
  }
}