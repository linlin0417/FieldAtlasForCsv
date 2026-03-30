import path from 'path';
import { listGhsIcons } from '../utils/file-io.js';

export async function listGhsResources({ baseUrl = '/assets/ghs' } = {}) {
  const icons = await listGhsIcons();
  return icons.map(fileName => ({
    id: path.basename(fileName, path.extname(fileName)),
    fileName,
    url: `${baseUrl}/${encodeURIComponent(fileName)}`
  }));
}
