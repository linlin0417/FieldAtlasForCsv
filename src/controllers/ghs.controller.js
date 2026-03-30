import { listGhsResources } from '../services/ghs.service.js';

export async function handleListGhs(req, res, next) {
  try {
    const icons = await listGhsResources();
    res.json({
      message: '成功取得 GHS 圖示',
      data: icons
    });
  } catch (error) {
    next(error);
  }
}
