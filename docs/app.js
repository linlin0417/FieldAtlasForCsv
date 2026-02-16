const INDEX_URL = '../data/index.json';
const DATASET_URL = '../data/json/SDS.json';
const MARKDOWN_BASE_URL = '../data/md/';
const INIT_RETRY_LIMIT = 10;
const INIT_RETRY_DELAY_MS = 100;
let keywordInput;
let resultList;
let resultSummary;
let modalDialog;
let modalCloseButton;
let detailTitle;
let detailCas;
let detailFormula;
let detailEn;
let detailHazard;
let detailAid;
let detailLd50;
let detailStability;
let markdownContent;
let copyMarkdownButton;

const state = {
  index: [],
  dataset: null,
  markdownCache: new Map(),
  lastMarkdownSource: '',
  copyTimer: null,
  activeCas: null,
  initialized: false,
  initAttempts: 0
};

let markedParser = typeof window.marked !== 'undefined' ? window.marked : null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

async function init() {
  if (state.initialized) {
    return;
  }

  ensureModalStructure();

  if (!cacheDomRefs()) {
    state.initAttempts += 1;
    if (state.initAttempts <= INIT_RETRY_LIMIT) {
      setTimeout(init, INIT_RETRY_DELAY_MS);
    } else {
      console.error('初始化失敗，仍找不到必要的 DOM 元素。');
    }
    return;
  }

  state.initAttempts = 0;
  state.initialized = true;

  copyMarkdownButton.disabled = true;
  resultSummary.textContent = '載入中...';

  try {
    await loadIndex();
    renderResults(state.index);
  } catch (error) {
    resultSummary.textContent = `載入索引失敗: ${error.message}`;
    console.error('載入索引失敗:', error);
  }

  ensureDataset().catch(error => {
    console.error('預先載入 SDS 資料失敗:', error);
  });

  keywordInput.addEventListener('input', handleKeywordChange);
  copyMarkdownButton.addEventListener('click', handleCopyMarkdown);
  if (modalCloseButton) {
    modalCloseButton.addEventListener('click', closeModal);
  }
  modalDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeModal();
  });
  modalDialog.addEventListener('click', event => {
    if (event.target === modalDialog) {
      closeModal();
    }
  });
  document.addEventListener('keydown', handleEscape);
}

function cacheDomRefs() {
  keywordInput = document.getElementById('keyword');
  resultList = document.getElementById('result-list');
  resultSummary = document.getElementById('result-summary');
  modalDialog = document.getElementById('detail-dialog');
  modalCloseButton = document.getElementById('modal-close');
  detailTitle = document.getElementById('detail-title');
  detailCas = document.getElementById('detail-cas');
  detailFormula = document.getElementById('detail-formula');
  detailEn = document.getElementById('detail-en');
  detailHazard = document.getElementById('detail-hazard');
  detailAid = document.getElementById('detail-aid');
  detailLd50 = document.getElementById('detail-ld50');
  detailStability = document.getElementById('detail-stability');
  markdownContent = document.getElementById('markdown-content');
  copyMarkdownButton = document.getElementById('copy-markdown');

  return Boolean(
    keywordInput &&
    resultList &&
    resultSummary &&
    modalDialog &&
    detailTitle &&
    detailCas &&
    detailFormula &&
    detailEn &&
    detailHazard &&
    detailAid &&
    detailLd50 &&
    detailStability &&
    markdownContent &&
    copyMarkdownButton
  );
}

function ensureModalStructure() {
  if (document.getElementById('detail-dialog')) {
    return;
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'detail-dialog';
  dialog.className = 'detail-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'detail-title');

  const inner = document.createElement('div');
  inner.className = 'dialog-inner';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'dialog-close';
  closeButton.id = 'modal-close';
  closeButton.setAttribute('aria-label', '關閉視窗');
  closeButton.innerHTML = '&times;';

  const header = document.createElement('header');
  header.className = 'dialog-header';

  const title = document.createElement('h2');
  title.id = 'detail-title';
  header.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'detail-meta';

  const casSpan = document.createElement('span');
  casSpan.id = 'detail-cas';
  casSpan.className = 'detail-chip';
  meta.appendChild(casSpan);

  const formulaSpan = document.createElement('span');
  formulaSpan.id = 'detail-formula';
  formulaSpan.className = 'detail-chip';
  meta.appendChild(formulaSpan);

  header.appendChild(meta);

  const bodySection = document.createElement('section');
  bodySection.className = 'dialog-body';

  const detailInfo = document.createElement('dl');
  detailInfo.className = 'detail-info';

  const infoConfig = [
    { label: '英文名稱', id: 'detail-en', isList: false },
    { label: '危害分類', id: 'detail-hazard', isList: false },
    { label: '急救措施', id: 'detail-aid', isList: true },
    { label: 'LD50', id: 'detail-ld50', isList: false },
    { label: '安定性與反應性', id: 'detail-stability', isList: false }
  ];

  infoConfig.forEach(item => {
    const wrapper = document.createElement('div');

    const term = document.createElement('dt');
    term.textContent = item.label;
    wrapper.appendChild(term);

    const desc = document.createElement('dd');
    if (item.isList) {
      const list = document.createElement('ul');
      list.className = 'aid-list';
      list.id = item.id;
      desc.appendChild(list);
    } else {
      const span = document.createElement('span');
      span.id = item.id;
      desc.appendChild(span);
    }
    wrapper.appendChild(desc);
    detailInfo.appendChild(wrapper);
  });

  const markdownSection = document.createElement('section');
  markdownSection.className = 'markdown-section';

  const sectionHeader = document.createElement('div');
  sectionHeader.className = 'section-header';

  const sectionTitle = document.createElement('h3');
  sectionTitle.textContent = 'Markdown 摘要';
  sectionHeader.appendChild(sectionTitle);

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.id = 'copy-markdown';
  copyButton.textContent = '複製內容';
  sectionHeader.appendChild(copyButton);

  const markdownContainer = document.createElement('div');
  markdownContainer.className = 'markdown-content';
  markdownContainer.id = 'markdown-content';

  markdownSection.appendChild(sectionHeader);
  markdownSection.appendChild(markdownContainer);

  bodySection.appendChild(detailInfo);
  bodySection.appendChild(markdownSection);

  inner.appendChild(closeButton);
  inner.appendChild(header);
  inner.appendChild(bodySection);

  dialog.appendChild(inner);

  const mainElement = document.querySelector('main');
  if (mainElement?.parentNode) {
    mainElement.parentNode.appendChild(dialog);
  } else {
    document.body.appendChild(dialog);
  }
}

async function loadIndex() {
  const response = await fetch(INDEX_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  state.index = await response.json();
}

function handleKeywordChange(event) {
  const keyword = event.target.value.trim();
  const filtered = filterRecords(keyword);
  renderResults(filtered, keyword);
}

function filterRecords(keyword) {
  if (!keyword) {
    return state.index;
  }
  const target = keyword.toLowerCase();
  return state.index.filter(item => {
    return [item.CasNo, item.ChemicalFormula, item.ZhtwName, item.EnName]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(target));
  });
}

function renderResults(records, keyword = '') {
  resultList.innerHTML = '';
  if (!records.length) {
    resultSummary.textContent = keyword ? `找不到符合「${keyword}」的資料。` : '目前沒有可顯示的資料。';
    const empty = document.createElement('li');
    empty.className = 'empty-hint';
    empty.textContent = '未找到符合條件的化學品。';
    resultList.appendChild(empty);
    return;
  }

  if (keyword) {
    resultSummary.textContent = `找到 ${records.length} 筆符合「${keyword}」的資料。`;
  } else {
    resultSummary.textContent = `共 ${records.length} 筆，點擊條目可檢視詳細資訊。`;
  }

  const fragment = document.createDocumentFragment();
  records.forEach(item => {
    const li = document.createElement('li');
    li.className = 'result-item';
    li.tabIndex = 0;
    li.dataset.cas = item.CasNo;

    const casSpan = document.createElement('span');
    casSpan.className = 'cas';
    casSpan.textContent = item.CasNo;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = `${item.ZhtwName} / ${item.EnName}`;

    const formulaSpan = document.createElement('span');
    formulaSpan.className = 'formula';
    formulaSpan.textContent = item.ChemicalFormula || '—';

    li.append(casSpan, nameSpan, formulaSpan);

    li.addEventListener('click', () => selectRecord(item.CasNo));
    li.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectRecord(item.CasNo);
      }
    });

    fragment.appendChild(li);
  });
  resultList.appendChild(fragment);
}

async function selectRecord(casNo) {
  try {
    await ensureDataset();
    const record = state.dataset?.[casNo];
    if (!record) {
      throw new Error(`找不到 CAS No. ${casNo} 的資料`);
    }
    renderDetail(record);
    await renderMarkdown(casNo);
  } catch (error) {
    console.error('載入 SDS 詳細資料失敗:', error);
    resultSummary.textContent = error.message;
    closeModal();
  }
}

async function ensureDataset() {
  if (state.dataset) {
    return;
  }
  const response = await fetch(DATASET_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  state.dataset = await response.json();
}

function renderDetail(record) {
  if (!detailTitle || !detailCas || !detailFormula) {
    console.error('無法渲染詳情視窗，必要元素不存在。');
    return;
  }
  state.activeCas = record.CasNo;
  detailTitle.textContent = record.ZhtwName || record.EnName || record.CasNo;
  detailCas.textContent = `CAS No. ${record.CasNo}`;
  detailFormula.textContent = record.ChemicalFormula ? `化學式 ${record.ChemicalFormula}` : '未提供化學式';
  detailEn.textContent = record.EnName || '—';
  renderHazard(record.HazardClassification);
  renderAid(record.FirstAidMeasures);
  detailLd50.textContent = record.LD50 || '—';
  detailStability.textContent = record.StabilityAndReactivity || '—';
  markdownContent.innerHTML = '';
  copyMarkdownButton.disabled = true;
  copyMarkdownButton.textContent = '複製內容';
  openModal();
}

function renderHazard(hazardString) {
  detailHazard.innerHTML = '';
  if (!hazardString) {
    detailHazard.textContent = '—';
    return;
  }
  const tags = hazardString.split(',').map(item => item.trim()).filter(Boolean);
  if (!tags.length) {
    detailHazard.textContent = hazardString;
    return;
  }
  const container = document.createElement('div');
  container.className = 'hazard-tags';
  tags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'hazard-tag';
    span.textContent = tag;
    container.appendChild(span);
  });
  detailHazard.appendChild(container);
}

function renderAid(measures = {}) {
  detailAid.innerHTML = '';
  const entries = [
    { label: '吸入', key: 'Inhalation' },
    { label: '眼睛接觸', key: 'EyeContact' },
    { label: '皮膚接觸', key: 'SkinContact' },
    { label: '食入', key: 'Ingestion' }
  ];
  let renderedCount = 0;
  entries.forEach(item => {
    const text = (measures[item.key] ?? '').toString().trim();
    if (!text) {
      return;
    }
    const li = document.createElement('li');
    li.textContent = `${item.label}: ${text}`;
    detailAid.appendChild(li);
    renderedCount += 1;
  });

  if (renderedCount === 0) {
    const li = document.createElement('li');
    li.textContent = '—';
    detailAid.appendChild(li);
  }
}

async function renderMarkdown(casNo) {
  markdownContent.textContent = '載入中...';
  copyMarkdownButton.disabled = true;
  copyMarkdownButton.textContent = '複製內容';

  try {
    if (!markedParser && typeof window.marked !== 'undefined') {
      markedParser = window.marked;
    }
    const markdown = await loadMarkdown(casNo);
    state.lastMarkdownSource = markdown;
    const html = transformMarkdown(markdown);
    markdownContent.innerHTML = html || '<p>無 Markdown 內容。</p>';
    copyMarkdownButton.disabled = !markdown;
  } catch (error) {
    console.error('載入 Markdown 失敗:', error);
    markdownContent.innerHTML = `<p>載入 Markdown 失敗: ${escapeHtml(error.message)}</p>`;
  }
}

async function loadMarkdown(casNo) {
  if (state.markdownCache.has(casNo)) {
    return state.markdownCache.get(casNo);
  }
  const response = await fetch(`${MARKDOWN_BASE_URL}${encodeURIComponent(casNo)}.md`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const text = await response.text();
  state.markdownCache.set(casNo, text);
  return text;
}

function transformMarkdown(markdown) {
  const text = markdown.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  if (!lines.length) {
    return '';
  }
  const firstLine = lines.shift();
  const firstText = firstLine.replace(/^#+\s*/, '').trim();
  let html = firstText ? `<p>${escapeHtml(firstText)}</p>` : '';
  const rest = lines.join('\n').trim();
  if (!rest) {
    return html;
  }
  const parser = resolveMarked();
  if (!parser) {
    return html + `<pre>${escapeHtml(rest)}</pre>`;
  }
  try {
    if (typeof parser === 'function') {
      return html + parser(rest, { breaks: true, gfm: true });
    }
    if (typeof parser.parse === 'function') {
      return html + parser.parse(rest, { breaks: true, gfm: true });
    }
  } catch (error) {
    console.warn('Markdown 解析失敗，退回原文', error);
    return html + `<pre>${escapeHtml(rest)}</pre>`;
  }
  return html + `<pre>${escapeHtml(rest)}</pre>`;
}

function resolveMarked() {
  if (window.marked?.marked) {
    return window.marked.marked;
  }
  if (window.marked) {
    return window.marked;
  }
  if (markedParser?.marked) {
    return markedParser.marked;
  }
  return markedParser;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function handleCopyMarkdown() {
  if (!state.lastMarkdownSource || !navigator.clipboard) {
    return;
  }
  navigator.clipboard.writeText(state.lastMarkdownSource)
    .then(() => {
      copyMarkdownButton.textContent = '已複製';
      clearTimeout(state.copyTimer);
      state.copyTimer = setTimeout(() => {
        copyMarkdownButton.textContent = '複製內容';
      }, 2000);
    })
    .catch(error => {
      console.error('剪貼簿錯誤', error);
      copyMarkdownButton.textContent = '複製失敗';
      clearTimeout(state.copyTimer);
      state.copyTimer = setTimeout(() => {
        copyMarkdownButton.textContent = '複製內容';
      }, 2000);
    });
}

function openModal() {
  if (!modalDialog) {
    console.error('無法開啟詳情視窗，缺少必要的 DOM 元素。');
    resultSummary.textContent = '詳情視窗元件尚未就緒，請重新整理頁面。';
    return;
  }
  if (!modalDialog.open) {
    try {
      if (typeof modalDialog.showModal === 'function') {
        modalDialog.showModal();
      } else {
        modalDialog.setAttribute('open', '');
      }
    } catch (error) {
      console.error('開啟詳情視窗時發生錯誤:', error);
      modalDialog.setAttribute('open', '');
    }
  }
  document.body.classList.add('dialog-open');
  modalDialog.scrollTop = 0;
  if (modalCloseButton) {
    setTimeout(() => {
      modalCloseButton.focus({ preventScroll: true });
    }, 50);
  }
}

function closeModal() {
  if (!modalDialog) {
    return;
  }
  if (modalDialog.open) {
    try {
      modalDialog.close();
    } catch (error) {
      console.warn('關閉 <dialog> 失敗，改採回退處理。', error);
      modalDialog.removeAttribute('open');
    }
  } else {
    modalDialog.removeAttribute('open');
  }
  document.body.classList.remove('dialog-open');
  state.activeCas = null;
  state.lastMarkdownSource = '';
  clearTimeout(state.copyTimer);
  state.copyTimer = null;
  copyMarkdownButton.disabled = true;
  copyMarkdownButton.textContent = '複製內容';
  markdownContent.innerHTML = '';
}

function handleEscape(event) {
  if (event.key === 'Escape' && (modalDialog?.open || modalDialog?.hasAttribute('open'))) {
    closeModal();
  }
}
