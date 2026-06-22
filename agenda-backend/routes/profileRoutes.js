const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const profileController = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth');

// Garantir que o diretório de uploads exista
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer para armazenamento de fotos (Memória)
const storage = multer.memoryStorage();

// Filtro de arquivos para aceitar apenas imagens comuns
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error('Formato de arquivo inválido. Envie apenas imagens (PNG, JPG, JPEG, GIF, WEBP).'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: fileFilter
});

// Registrar rotas protegidas por JWT
router.get('/', authenticateToken, profileController.getProfile);
router.put('/update', authenticateToken, profileController.updateProfile);
router.put('/password', authenticateToken, profileController.updatePassword);
router.post('/photo', authenticateToken, (req, res, next) => {
  upload.single('foto')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, profileController.uploadPhoto);

module.exports = router;
