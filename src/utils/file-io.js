import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const csvHeader = 'CasNo,ZhtwName,EnName,HazardClassification,Inhalation,EyeContact,SkinContact,Ingestion,LD50,StabilityAndReactivity';

export const dataPaths = {
  csv: path.join(projectRoot, 'data/csv/SDS.csv'),
  json: path.join(projectRoot, 'data/json/SDS.json'),
  mdDir: path.join(projectRoot, 'data/md')
};

export async function ensureBaseFiles() {
  await fs.mkdir(dataPaths.mdDir, { recursive: true });
  await fs.mkdir(path.dirname(dataPaths.csv), { recursive: true });
  await fs.mkdir(path.dirname(dataPaths.json), { recursive: true });

  try {
    await fs.access(dataPaths.csv);
  } catch {
    await fs.writeFile(dataPaths.csv, `${csvHeader}\n`, 'utf8');
  }

  try {
    await fs.access(dataPaths.json);
  } catch {
    await fs.writeFile(dataPaths.json, '{}\n', 'utf8');
  }
}

export async function readJsonFile() {
  try {
    const raw = await fs.readFile(dataPaths.json, 'utf8');
    const trimmed = raw.trim();
    if (!trimmed) {
      return {};
    }
    return JSON.parse(trimmed);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function parseCsvLine(line) {
  const result = [];
  let buffer = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buffer += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(buffer);
      buffer = '';
    } else {
      buffer += char;
    }
  }
  result.push(buffer);
  return result;
}

export async function readCsvFile() {
  try {
    const raw = await fs.readFile(dataPaths.csv, 'utf8');
    const lines = raw.split(/\r?\n/).filter(line => line.length > 0);
    if (lines.length <= 1) {
      return [];
    }
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map(line => {
      const cells = parseCsvLine(line);
      const record = {};
      headers.forEach((header, index) => {
        record[header] = cells[index] ?? '';
      });
      return record;
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function escapeCsvCell(value) {
  const stringValue = value?.toString() ?? '';
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function writeJsonFile(payload) {
  const content = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(dataPaths.json, content, 'utf8');
}

export async function writeCsvFile(records) {
  const cells = [csvHeader];
  records.forEach(record => {
    const row = [
      escapeCsvCell(record.CasNo),
      escapeCsvCell(record.ZhtwName),
      escapeCsvCell(record.EnName),
      escapeCsvCell(record.HazardClassification),
      escapeCsvCell(record.Inhalation),
      escapeCsvCell(record.EyeContact),
      escapeCsvCell(record.SkinContact),
      escapeCsvCell(record.Ingestion),
      escapeCsvCell(record.LD50),
      escapeCsvCell(record.StabilityAndReactivity)
    ].join(',');
    cells.push(row);
  });
  const content = `${cells.join('\n')}\n`;
  await fs.writeFile(dataPaths.csv, content, 'utf8');
}

function buildMarkdown(record) {
  const hazardLines = record.hazardClassification
    .map(item => `  - ${item}`)
    .join('\n') || '  - 無資料';

  return `${record.zhtwName} (${record.enName})\n` +
    `- CAS No.: ${record.casNo}\n` +
    `- 危害分類:\n${hazardLines}\n` +
    `- 處置方式:\n` +
    `  - 吸入: ${record.firstAidMeasures.inhalation}\n` +
    `  - 眼睛接觸: ${record.firstAidMeasures.eyeContact}\n` +
    `  - 皮膚接觸: ${record.firstAidMeasures.skinContact}\n` +
    `  - 食入: ${record.firstAidMeasures.ingestion}\n` +
    `- LD50: ${record.ld50}\n` +
    `- 安定性: ${record.stabilityAndReactivity}\n`;
}

export async function writeMarkdownFile(record) {
  const content = buildMarkdown(record);
  const filePath = path.join(dataPaths.mdDir, `${record.casNo}.md`);
  await fs.writeFile(filePath, content, 'utf8');
}

export async function deleteMarkdownFile(casNo) {
  const filePath = path.join(dataPaths.mdDir, `${casNo}.md`);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function listMarkdownFiles() {
  try {
    const entries = await fs.readdir(dataPaths.mdDir, { withFileTypes: true });
    return entries.filter(entry => entry.isFile()).map(entry => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
