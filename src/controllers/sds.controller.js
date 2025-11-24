import {
  listRecords,
  getRecord,
  createRecord,
  removeRecord,
  validateIntegrity
} from '../services/sds.service.js';
import { querySchema } from '../validators/sds.validator.js';

export async function handleCreate(req, res, next) {
  try {
    const result = await createRecord(req.body);
    res.status(201).json({
      message: '新增成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export function handleList(req, res, next) {
  try {
    const query = querySchema.parse(req.query);
    const result = listRecords(query);
    res.json({
      message: '查詢成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export function handleGet(req, res, next) {
  try {
    const result = getRecord(req.params.casNo);
    res.json({
      message: '查詢成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDelete(req, res, next) {
  try {
    await removeRecord(req.params.casNo);
    res.json({
      message: '刪除完成'
    });
  } catch (error) {
    next(error);
  }
}

export async function handleIntegrity(req, res, next) {
  try {
    const result = await validateIntegrity();
    res.json({
      message: result.ok ? '檔案驗證通過' : '檔案驗證發現異常',
      data: result
    });
  } catch (error) {
    next(error);
  }
}
