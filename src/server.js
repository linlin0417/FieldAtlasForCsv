import express from 'express';
import helmet from 'helmet';
import sdsRoutes from './routes/sds.routes.js';
import logger from './utils/logger.js';
import { initDataStore } from './services/sds.service.js';
import { AppError, isAppError } from './utils/errors.js';

export async function createServer() {
  await initDataStore();

  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/sds', sdsRoutes);

  app.use((req, res, next) => {
    next(new AppError('找不到對應的路由', 404));
  });

  app.use((error, req, res, next) => {
    if (!isAppError(error)) {
      logger.error('發生未預期錯誤: %s', error.message);
    }
    const statusCode = error.statusCode || 500;
    const response = {
      message: error.message || '伺服器發生錯誤'
    };
    if (error.details) {
      response.details = error.details;
    }
    res.status(statusCode).json(response);
  });

  return app;
}
