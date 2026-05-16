const multer = require('multer');
const cloudinary = require('../config/cloudinary.js');
const {CloudinaryStorage} = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'question-bank-images',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
    },
});

const uploadImage = multer({storage});

module.exports = uploadImage;