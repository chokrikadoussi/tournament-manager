import { Router } from 'express';
import multer from 'multer';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './registrations.controller.js';
import { writeLimiter } from '../lib/rateLimiter.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV sont acceptés'));
    }
  },
});

// mergeParams: true pour accéder à req.params.id du router parent (tournamentId)
const router = Router({ mergeParams: true });

router.get('/', asyncWrap(controller.getAll));
router.post('/import/preview', writeLimiter, upload.single('file'), asyncWrap(controller.previewImport));
router.post('/import', writeLimiter, upload.single('file'), asyncWrap(controller.importCSV));
router.post('/', writeLimiter, asyncWrap(controller.register));
router.delete('/:competitorId', writeLimiter, asyncWrap(controller.unregister));
router.patch('/:competitorId', writeLimiter, asyncWrap(controller.updateSeed));

export default router;
