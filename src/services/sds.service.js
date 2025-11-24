import path from 'path';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import {
  ensureBaseFiles,
  readJsonFile,
  readCsvFile,
  writeJsonFile,
  writeCsvFile,
  writeMarkdownFile,
  deleteMarkdownFile,
  listMarkdownFiles,
  dataPaths
} from '../utils/file-io.js';
import { parseSdsPayload, safeParseSdsPayload, normaliseHazardClassification } from '../validators/sds.validator.js';

const dataStore = new Map();

function compareCasNo(left, right) {
  const tokenA = left.replace(/-/g, '');
  const tokenB = right.replace(/-/g, '');
  return tokenA.localeCompare(tokenB, 'en', { numeric: true });
}

function toExternal(record) {
  return {
    CasNo: record.casNo,
    ZhtwName: record.zhtwName,
    EnName: record.enName,
    ChemicalFormula: record.chemicalFormula,
    HazardClassification: record.hazardClassification.join(','),
    FirstAidMeasures: {
      Inhalation: record.firstAidMeasures.inhalation,
      EyeContact: record.firstAidMeasures.eyeContact,
      SkinContact: record.firstAidMeasures.skinContact,
      Ingestion: record.firstAidMeasures.ingestion
    },
    LD50: record.ld50,
    StabilityAndReactivity: record.stabilityAndReactivity
  };
}

function toCsvRow(record) {
  return {
    CasNo: record.casNo,
    ZhtwName: record.zhtwName,
    EnName: record.enName,
    ChemicalFormula: record.chemicalFormula,
    HazardClassification: record.hazardClassification.join(','),
    Inhalation: record.firstAidMeasures.inhalation,
    EyeContact: record.firstAidMeasures.eyeContact,
    SkinContact: record.firstAidMeasures.skinContact,
    Ingestion: record.firstAidMeasures.ingestion,
    LD50: record.ld50,
    StabilityAndReactivity: record.stabilityAndReactivity
  };
}

function recordsEqual(a, b) {
  return (
    a.casNo === b.casNo &&
    a.zhtwName === b.zhtwName &&
    a.enName === b.enName &&
    a.chemicalFormula === b.chemicalFormula &&
    a.ld50 === b.ld50 &&
    a.stabilityAndReactivity === b.stabilityAndReactivity &&
    a.firstAidMeasures.inhalation === b.firstAidMeasures.inhalation &&
    a.firstAidMeasures.eyeContact === b.firstAidMeasures.eyeContact &&
    a.firstAidMeasures.skinContact === b.firstAidMeasures.skinContact &&
    a.firstAidMeasures.ingestion === b.firstAidMeasures.ingestion &&
    a.hazardClassification.length === b.hazardClassification.length &&
    a.hazardClassification.every((item, index) => item === b.hazardClassification[index])
  );
}

function hydrateRecord(raw) {
  const latest = parseSdsPayload(raw);
  return latest;
}

async function persistAll() {
  const sortedRecords = Array.from(dataStore.values()).sort((a, b) => compareCasNo(a.casNo, b.casNo));
  const jsonPayload = {};
  const csvPayload = [];

  sortedRecords.forEach(record => {
    const external = toExternal(record);
    jsonPayload[record.casNo] = external;
    csvPayload.push(toCsvRow(record));
  });

  await writeJsonFile(jsonPayload);
  await writeCsvFile(csvPayload);
  await Promise.all(sortedRecords.map(record => writeMarkdownFile(record)));

  const currentMarkdownFiles = await listMarkdownFiles();
  const expected = new Set(sortedRecords.map(record => `${record.casNo}.md`));
  const stale = currentMarkdownFiles.filter(fileName => !expected.has(fileName));

  await Promise.all(
    stale.map(async fileName => {
      const casNo = path.basename(fileName, '.md');
      try {
        await deleteMarkdownFile(casNo);
      } catch (error) {
        logger.warn('移除舊 Markdown 檔案 %s 時發生錯誤: %s', fileName, error.message);
      }
    })
  );
}

function mergeRecord(record) {
  const existing = dataStore.get(record.casNo);
  if (existing && !recordsEqual(existing, record)) {
    logger.warn('載入時發現 CAS No. %s 的資料不一致，採用較新資料覆蓋', record.casNo);
  }
  dataStore.set(record.casNo, record);
}

async function importFromJson() {
  const jsonData = await readJsonFile();
  const issues = [];
  for (const [casNo, payload] of Object.entries(jsonData)) {
    const result = safeParseSdsPayload(payload);
    if (!result.success) {
      issues.push({ casNo, message: result.error.message });
      continue;
    }
    mergeRecord(result.data);
  }
  return issues;
}

async function importFromCsv() {
  const csvData = await readCsvFile();
  const issues = [];
  csvData.forEach(row => {
    const candidate = {
      CasNo: row.CasNo,
      ZhtwName: row.ZhtwName,
      EnName: row.EnName,
        ChemicalFormula: row.ChemicalFormula,
      HazardClassification: normaliseHazardClassification(row.HazardClassification),
      FirstAidMeasures: {
        Inhalation: row.Inhalation,
        EyeContact: row.EyeContact,
        SkinContact: row.SkinContact,
        Ingestion: row.Ingestion
      },
      LD50: row.LD50,
      StabilityAndReactivity: row.StabilityAndReactivity
    };
    const result = safeParseSdsPayload(candidate);
    if (!result.success) {
      issues.push({ casNo: row.CasNo, message: result.error.message });
      return;
    }
    mergeRecord(result.data);
  });
  return issues;
}

export async function initDataStore() {
  await ensureBaseFiles();
  dataStore.clear();

  const jsonIssues = await importFromJson();
  const csvIssues = await importFromCsv();

  await persistAll();

  if (jsonIssues.length > 0 || csvIssues.length > 0) {
    logger.warn('初始化資料時發現資料格式問題: JSON %d 筆, CSV %d 筆', jsonIssues.length, csvIssues.length);
    jsonIssues.forEach(issue => logger.warn('JSON 檔案異常 - CAS %s: %s', issue.casNo, issue.message));
    csvIssues.forEach(issue => logger.warn('CSV 檔案異常 - CAS %s: %s', issue.casNo, issue.message));
  }

  logger.info('資料載入完成，共 %d 筆', dataStore.size);
}

export function listRecords({ casNo } = {}) {
  const keyword = casNo?.trim();
  const records = Array.from(dataStore.values())
    .filter(record => {
      if (!keyword) {
        return true;
      }
      return record.casNo.includes(keyword);
    })
    .sort((a, b) => compareCasNo(a.casNo, b.casNo))
    .map(record => toExternal(record));
  return records;
}

export function getRecord(casNo) {
  const key = casNo?.trim();
  if (!key) {
    throw new AppError('請提供有效的 CAS No.', 400);
  }
  const record = dataStore.get(key);
  if (!record) {
    throw new AppError(`找不到 CAS No. 為 ${key} 的資料`, 404);
  }
  return toExternal(record);
}

export async function createRecord(payload) {
  const record = hydrateRecord(payload);
  if (dataStore.has(record.casNo)) {
    const message = `CAS No. ${record.casNo} 已存在`; 
    logger.warn(message);
    throw new AppError(message, 409);
  }
  dataStore.set(record.casNo, record);
  await persistAll();
  logger.info('已新增 CAS No. %s', record.casNo);
  return toExternal(record);
}

export async function removeRecord(casNo) {
  const key = casNo?.trim();
  if (!key) {
    throw new AppError('請提供有效的 CAS No.', 400);
  }
  if (!dataStore.has(key)) {
    throw new AppError(`找不到 CAS No. 為 ${key} 的資料`, 404);
  }
  dataStore.delete(key);
  await persistAll();
  logger.info('已刪除 CAS No. %s', key);
}

function diffRecords(sourceMap, targetMap) {
  const missing = [];
  const mismatched = [];

  sourceMap.forEach((record, casNo) => {
    const counterpart = targetMap.get(casNo);
    if (!counterpart) {
      missing.push(casNo);
      return;
    }
    if (!recordsEqual(record, counterpart)) {
      mismatched.push(casNo);
    }
  });

  return { missing, mismatched };
}

function mapFromJsonObject(jsonObject) {
  const map = new Map();
  Object.entries(jsonObject).forEach(([casNo, payload]) => {
    const result = safeParseSdsPayload(payload);
    if (result.success) {
      map.set(casNo, result.data);
    }
  });
  return map;
}

function mapFromCsvRows(csvRows) {
  const map = new Map();
  csvRows.forEach(row => {
    const candidate = {
      CasNo: row.CasNo,
      ZhtwName: row.ZhtwName,
      EnName: row.EnName,
      ChemicalFormula: row.ChemicalFormula,
      HazardClassification: normaliseHazardClassification(row.HazardClassification),
      FirstAidMeasures: {
        Inhalation: row.Inhalation,
        EyeContact: row.EyeContact,
        SkinContact: row.SkinContact,
        Ingestion: row.Ingestion
      },
      LD50: row.LD50,
      StabilityAndReactivity: row.StabilityAndReactivity
    };
    const result = safeParseSdsPayload(candidate);
    if (result.success) {
      map.set(row.CasNo, result.data);
    }
  });
  return map;
}

export async function validateIntegrity() {
  const jsonData = await readJsonFile();
  const csvRows = await readCsvFile();

  const jsonMap = mapFromJsonObject(jsonData);
  const csvMap = mapFromCsvRows(csvRows);

  const currentMap = new Map(dataStore);

  const jsonDiff = diffRecords(currentMap, jsonMap);
  const csvDiff = diffRecords(currentMap, csvMap);

  const extraJson = diffRecords(jsonMap, currentMap);
  const extraCsv = diffRecords(csvMap, currentMap);

  const hasIssue = [
    jsonDiff.missing.length,
    jsonDiff.mismatched.length,
    csvDiff.missing.length,
    csvDiff.mismatched.length,
    extraJson.missing.length,
    extraCsv.missing.length
  ].some(count => count > 0);

  return {
    ok: !hasIssue,
    summary: {
      currentCount: currentMap.size,
      jsonCount: jsonMap.size,
      csvCount: csvMap.size
    },
    json: {
      missing: jsonDiff.missing,
      mismatched: jsonDiff.mismatched,
      extra: extraJson.missing
    },
    csv: {
      missing: csvDiff.missing,
      mismatched: csvDiff.mismatched,
      extra: extraCsv.missing
    }
  };
}
