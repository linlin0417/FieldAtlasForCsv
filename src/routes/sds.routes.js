import { Router } from 'express';
import {
  handleCreate,
  handleList,
  handleGet,
  handleDelete,
  handleIntegrity,
  handleUpdate
} from '../controllers/sds.controller.js';

const router = Router();

router.get('/integrity', handleIntegrity);
router.get('/', handleList);
router.get('/:casNo', handleGet);
router.post('/', handleCreate);
router.put('/:casNo', handleUpdate);
router.delete('/:casNo', handleDelete);

export default router;
