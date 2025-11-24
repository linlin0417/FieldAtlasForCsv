import { Router } from 'express';
import {
  handleCreate,
  handleList,
  handleGet,
  handleDelete,
  handleIntegrity
} from '../controllers/sds.controller.js';

const router = Router();

router.get('/integrity', handleIntegrity);
router.get('/', handleList);
router.get('/:casNo', handleGet);
router.post('/', handleCreate);
router.delete('/:casNo', handleDelete);

export default router;
