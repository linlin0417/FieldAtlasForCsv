const recordList = document.getElementById('record-list');
const searchInput = document.getElementById('record-search');
const recordCount = document.getElementById('record-count');
const modeIndicator = document.getElementById('mode-indicator');
const form = document.getElementById('editor-form');
const feedback = document.getElementById('form-feedback');
const ghsPalette = document.getElementById('ghs-palette');
const clearButton = document.getElementById('clear-button');
const casInput = document.getElementById('cas-input');
const hazardInput = document.getElementById('hazard-input');
const molecularInput = document.getElementById('molecular-weight');
const ld50Input = document.getElementById('ld50');
const lc50Input = document.getElementById('lc50');
const stabilityInput = document.getElementById('stability-input');
const chineseInput = document.getElementById('chinese-name');
const englishInput = document.getElementById('english-name');
const formulaInput = document.getElementById('chemical-formula');
const inhalationInput = document.getElementById('first-aid-inhalation');
const eyeInput = document.getElementById('first-aid-eye');
const skinInput = document.getElementById('first-aid-skin');
const ingestionInput = document.getElementById('first-aid-ingestion');

const state = {
  records: [],
  ghs: [],
  filtered: [],
  selectedGhs: new Set(),
  activeCas: null,
  mode: 'create'
};

async function init() {
  await Promise.all([fetchRecords(), fetchGhs()]);
  form.addEventListener('submit', handleSubmit);
  searchInput.addEventListener('input', handleSearch);
  clearButton.addEventListener('click', resetForm);
}

async function fetchRecords() {
  try {
    const response = await fetch('/api/sds');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    state.records = (payload.data || []).slice().sort((left, right) =>
      left.CasNo.localeCompare(right.CasNo, 'en', { numeric: true })
    );
    state.filtered = state.records;
    recordCount.textContent = state.records.length;
    renderRecordList();
  } catch (error) {
    showFeedback('記錄載入失敗，請稍後再試。', 'error');
    console.error('fetchRecords', error);
  }
}

async function fetchGhs() {
  try {
    const response = await fetch('/api/ghs');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    state.ghs = payload.data || [];
    renderGhsPalette();
  } catch (error) {
    console.error('fetchGhs', error);
  }
}

function renderRecordList(records = state.filtered) {
  recordList.innerHTML = '';
  if (!records.length) {
    const empty = document.createElement('li');
    empty.textContent = '目前尚無符合的紀錄。';
    recordList.appendChild(empty);
    return;
  }
  records.forEach(item => {
    const li = document.createElement('li');
    li.tabIndex = 0;
    li.dataset.cas = item.CasNo;
    li.innerHTML = `
      <div>
        <strong>${item.CasNo}</strong>
        <span>${item.ZhtwName}</span>
      </div>
      <p class="record-meta">${item.EnName} · ${item.ChemicalFormula || '—'}</p>
    `;
    if (state.activeCas === item.CasNo) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => selectRecord(item.CasNo));
    li.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectRecord(item.CasNo);
      }
    });
    recordList.appendChild(li);
  });
}

function handleSearch(event) {
  const term = event.target.value.trim().toLowerCase();
  if (!term) {
    state.filtered = state.records;
  } else {
    state.filtered = state.records.filter(record => {
      return [record.CasNo, record.ZhtwName, record.EnName, record.ChemicalFormula]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(term));
    });
  }
  renderRecordList();
}

function selectRecord(casNo) {
  const item = state.records.find(record => record.CasNo === casNo);
  if (!item) {
    showFeedback('找不到該筆資料。', 'error');
    return;
  }
  fillForm(item);
  state.activeCas = casNo;
  state.mode = 'edit';
  modeIndicator.textContent = `編輯：${casNo}`;
  casInput.readOnly = true;
  renderRecordList();
}

function fillForm(data) {
  casInput.value = data.CasNo;
  chineseInput.value = data.ZhtwName;
  englishInput.value = data.EnName;
  formulaInput.value = data.ChemicalFormula;
  molecularInput.value = data.MolecularWeight || '';
  hazardInput.value = (data.HazardClassification || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .join('\n');
  ld50Input.value = data.LD50 || '';
  lc50Input.value = data.LC50 || '';
  stabilityInput.value = data.StabilityAndReactivity || '';
  inhalationInput.value = data.FirstAidMeasures?.Inhalation || '';
  eyeInput.value = data.FirstAidMeasures?.EyeContact || '';
  skinInput.value = data.FirstAidMeasures?.SkinContact || '';
  ingestionInput.value = data.FirstAidMeasures?.Ingestion || '';
  state.selectedGhs = new Set(resolveGhsFromRecord(data));
  syncGhsPalette();
}

function resolveGhsFromRecord(record) {
  if (!record) {
    return [];
  }
  if (Array.isArray(record.GHSList) && record.GHSList.length) {
    return record.GHSList.map(item => item?.trim()).filter(Boolean);
  }
  if (typeof record.GHS === 'string' && record.GHS.trim()) {
    return record.GHS.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function renderGhsPalette() {
  ghsPalette.innerHTML = '';
  state.ghs.forEach(icon => {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ghs-toggle';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.dataset.code = icon.id;
    toggle.innerHTML = `
      <img src="${icon.url}" alt="${icon.id} 圖示">
      <span>${icon.id}</span>
    `;
    toggle.addEventListener('click', () => {
      const code = toggle.dataset.code;
      if (state.selectedGhs.has(code)) {
        state.selectedGhs.delete(code);
        toggle.setAttribute('aria-pressed', 'false');
      } else {
        state.selectedGhs.add(code);
        toggle.setAttribute('aria-pressed', 'true');
      }
    });
    ghsPalette.appendChild(toggle);
  });
  syncGhsPalette();
}

function syncGhsPalette() {
  const toggles = ghsPalette.querySelectorAll('.ghs-toggle');
  toggles.forEach(toggle => {
    const code = toggle.dataset.code;
    toggle.setAttribute('aria-pressed', state.selectedGhs.has(code).toString());
  });
}

function gatherFormPayload() {
  const hazards = hazardInput.value
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
  return {
    CasNo: casInput.value.trim(),
    ZhtwName: chineseInput.value.trim(),
    EnName: englishInput.value.trim(),
    ChemicalFormula: formulaInput.value.trim(),
    MolecularWeight: molecularInput.value.trim(),
    HazardClassification: hazards,
    FirstAidMeasures: {
      Inhalation: inhalationInput.value.trim(),
      EyeContact: eyeInput.value.trim(),
      SkinContact: skinInput.value.trim(),
      Ingestion: ingestionInput.value.trim()
    },
    LD50: ld50Input.value.trim(),
    LC50: lc50Input.value.trim(),
    StabilityAndReactivity: stabilityInput.value.trim(),
    GHS: Array.from(state.selectedGhs)
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  const payload = gatherFormPayload();
  if (!payload.CasNo) {
    showFeedback('CAS No. 為必填項目。', 'error');
    return;
  }
  try {
    const method = state.mode === 'edit' ? 'PUT' : 'POST';
    const target = state.mode === 'edit' ? `/api/sds/${state.activeCas}` : '/api/sds';
    const response = await fetch(target, {
      method,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.message || '伺服器回傳錯誤');
    }
    showFeedback(result?.message || '儲存成功', 'success');
    await fetchRecords();
    if (state.mode === 'create') {
      resetForm();
    } else {
      state.activeCas = payload.CasNo;
      setTimeout(() => selectRecord(payload.CasNo), 0);
    }
  } catch (error) {
    console.error('handleSubmit', error);
    showFeedback(error.message || '儲存失敗', 'error');
  }
}

function resetForm() {
  form.reset();
  state.mode = 'create';
  state.activeCas = null;
  state.selectedGhs.clear();
  syncGhsPalette();
  modeIndicator.textContent = '新增中';
  casInput.readOnly = false;
  feedback.textContent = '';
  feedback.removeAttribute('data-state');
  renderRecordList();
}

function showFeedback(message, status) {
  feedback.textContent = message;
  feedback.dataset.state = status;
}

init();
