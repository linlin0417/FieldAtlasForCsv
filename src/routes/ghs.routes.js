import { Router } from 'express';
import { handleListGhs } from '../controllers/ghs.controller.js';

const router = Router();

router.get('/', handleListGhs);

export default router;
