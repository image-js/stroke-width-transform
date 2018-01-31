import strokeWidthTransform from '..';
import {Image} from 'image-js';

describe('test Stroke Width Transform', () => {
  test('main test', async () => {
      await Image.load('sample/sample-passport.jpg').then(function (image) {
        expect(strokeWidthTransform(image, {})).toBe(true);
      });
  });
});
