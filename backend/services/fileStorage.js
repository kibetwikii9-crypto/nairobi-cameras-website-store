const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../../images/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `product-${timestamp}-${random}${ext.toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  }
});

function buildImageResponse(file) {
  return {
    filename: file.filename,
    url: `/images/uploads/${file.filename}`,
    size: file.size || 0,
    mimetype: file.mimetype || 'image/jpeg',
    uploadedAt: new Date().toISOString()
  };
}

module.exports = {
  upload,
  buildImageResponse,
  uploadDir
};






