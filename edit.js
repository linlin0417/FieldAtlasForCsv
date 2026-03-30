import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { createServer } from './src/server.js';
import logger from './src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const editorRoot = path.join(__dirname, 'docs/editor');
const ghsAssets = path.join(__dirname, 'data/ghs');
const port = Number(process.env.PORT) || 5004;

createServer({
  mountStaticRoutes(app) {
    app.use(express.static(editorRoot));
    app.use('/assets/ghs', express.static(ghsAssets));
    app.get('/', (req, res) => {
      res.sendFile(path.join(editorRoot, 'index.html'));
    });
  }
})
  .then(app => {
    app.listen(port, () => {
      logger.info('編輯介面可在 http://localhost:%d 查看', port);
    });
  })
  .catch(error => {
    logger.error('編輯伺服器啟動失敗: %s', error.message);
    process.exit(1);
  });
