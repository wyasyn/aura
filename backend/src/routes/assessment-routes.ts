import express from 'express';
import multer from 'multer';
import { assessSkin } from '../controllers/AssessmentController';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Assessment endpoints
router.post('/assess', upload.single('image'), assessSkin);
router.post('/upload', upload.single('image'), assessSkin);

export default router;
