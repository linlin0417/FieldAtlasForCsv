import { createServer } from './src/server.js';
import logger from './src/utils/logger.js';

const port = Number(process.env.PORT) || 5174;

createServer()
  .then(app => {
    app.listen(port, () => {
      logger.info('SDS 服務已啟動，埠號 %d', port);
    });
  })
  .catch(error => {
    logger.error('服務啟動失敗: %s', error.message);
    process.exit(1);
  });
