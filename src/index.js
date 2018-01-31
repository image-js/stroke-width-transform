import CCV from '../dist/ccv';
import Image from 'image-js';
import ImageData from './ImageData';
const CCVLib = CCV({});

export default function strokeWidthTransform(image, options={}) {
  var imageData = ImageData.fromImage(image);
  const denseMatrix = new CCVLib.ccv_dense_matrix_t();
  CCVLib.ccv_read(imageData, denseMatrix);
  const rects = CCVLib.ccv_swt_detect_words(denseMatrix, CCVLib.ccv_swt_default_params);
  return rects.toJS();
}
