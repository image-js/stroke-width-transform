export default class ImageData {
    constructor(data, width, height) {
        if(data.length % 4 !== 0) {
            throw new RangeError('Data is not multiple of 4');
        }

        if(data.length !== 4 * width * height) {
            throw new RangeError("input data length is not equal to 4 * width * height");
        }

        this.data = data;
        this.width = width;
        this.height = height;
    }

    static fromImage(image) {
        return new this(image.getRGBAData(), image.width, image.height);
    }
}