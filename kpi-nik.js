const SHEET_ID = "2PACX-1vQtw4zahkq1MPDzwQJDjWRDdUN4ffG8O4aokdiIBvxh_YKvxnQ6-hNpTQXkQoidX8TrHZ0bku-VJE4K";
const KPI_GID = "315150517";

const state = {
  rows: [],
  columns: {},
  date: "",
  office: "ALL",
  officeMode: "ALL",
  segment: "ALL",
  tkType: "ALL",
  tableOffices: [],
  tableSort: { key: "invalid", direction: "desc" },
};

const els = {
  sourceNote: document.querySelector("#nikSourceNote"),
  meta: document.querySelector("#nikMeta"),
  officeFilter: document.querySelector("#nikOfficeFilter"),
  officeModeFilter: document.querySelector("#nikOfficeModeFilter"),
  segmentFilter: document.querySelector("#nikSegmentFilter"),
  tkTypeFilter: document.querySelector("#nikTkTypeFilter"),
  resetFilters: document.querySelector("#resetNikFilters"),
  latestValue: document.querySelector("#nikLatestValue"),
  latestInvalid: document.querySelector("#nikLatestInvalid"),
  newInvalid: document.querySelector("#nikNewInvalid"),
  oldInvalid: document.querySelector("#nikOldInvalid"),
  latestValueProgress: document.querySelector("#nikLatestValueProgress"),
  latestInvalidProgress: document.querySelector("#nikLatestInvalidProgress"),
  newInvalidProgress: document.querySelector("#nikNewInvalidProgress"),
  oldInvalidProgress: document.querySelector("#nikOldInvalidProgress"),
  trendSubtitle: document.querySelector("#nikTrendSubtitle"),
  trendPanel: document.querySelector("#nikTrendPanel"),
  trendResume: document.querySelector("#nikTrendResume"),
  movementSubtitle: document.querySelector("#nikMovementSubtitle"),
  movementPanel: document.querySelector("#nikMovementPanel"),
  insightSubtitle: document.querySelector("#nikInsightSubtitle"),
  insightPanel: document.querySelector("#nikInsightPanel"),
  tableSubtitle: document.querySelector("#nikTableSubtitle"),
  tableHead: document.querySelector("#nikTableHead"),
  tableBody: document.querySelector("#nikTableBody"),
  officeChecklist: document.querySelector("#nikOfficeChecklist"),
  officeChecklistButton: document.querySelector("#nikOfficeChecklistButton"),
  officeChecklistMenu: document.querySelector("#nikOfficeChecklistMenu"),
  downloadCsv: document.querySelector("#downloadNikCsv"),
  toast: document.querySelector("#toast"),
};

const fmtNumber = new Intl.NumberFormat("id-ID");
const fmtDecimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function sheetCsvUrl() {
  return `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${KPI_GID}&single=true&output=csv`;
}

async function loadKpiNik() {
  try {
    els.meta.textContent = "Memuat sheet KPI...";
    const text = await fetchCsv(sheetCsvUrl());
    state.rows = parseCsv(text);
    state.columns = mapColumns(state.rows);
    validateColumns();
    renderFilters();
    render();
    showToast("Data KPI NIK berhasil dimuat.");
  } catch (error) {
    els.meta.textContent = "Gagal membaca sheet KPI.";
    showToast(error.message);
  }
}

async function fetchCsv(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Gagal membaca spreadsheet: HTTP ${response.status}`);
  return response.text();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text ?? "").replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1)
    .filter((values) => values.some((value) => String(value ?? "").trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function mapColumns(rows) {
  const headers = Object.keys(rows[0] ?? {});
  const byNorm = new Map(headers.map((header) => [normalizeKey(header), header]));
  const pick = (...candidates) => candidates.map(normalizeKey).map((key) => byNorm.get(key)).find(Boolean);
  return {
    date: pick("tgl_proses"),
    segment: pick("kode_tipe"),
    code: pick("kode_kantor", "kode_cabang", "kode kantor"),
    name: pick("nama_kantor", "nama_cabang", "nama kantor"),
    newInvalid: pick("tk_baru_nik_invalid", "tk baru nik invalid"),
    invalid: pick("tk_aktif_baru_nik_invalid", "tk aktif baru nik invalid", "tk_aktif_nik_invalid", "nik_invalid"),
    value: pick("pengurang_tk_aktif_baru", "pengurang_tk_aktif", "pengurang_tkaktif", "pengurang tk aktif", "pengurang_tk)aktif"),
  };
}

function normalizeKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function validateColumns() {
  const missing = Object.entries(state.columns).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`Kolom KPI belum lengkap: ${missing.join(", ")}.`);
  }
}

function renderFilters() {
  const dates = uniqueValues(state.rows, state.columns.date).sort(compareDateDesc);
  state.date = dates[0] ?? "";
  const latestRows = rowsForLatest();
  const offices = latestRows
    .filter((row) => readCode(row) !== "905")
    .map((row) => ({ value: readCode(row), label: `${readCode(row)} - ${readName(row)}` }))
    .sort((a, b) => a.value.localeCompare(b.value, "id", { numeric: true }));
  if (state.office !== "ALL" && !offices.some((item) => item.value === state.office)) state.office = "ALL";
  setOptions(els.officeFilter, [{ value: "ALL", label: "905 - Kanwil Jateng DIY" }, ...offices], state.office);
  els.officeModeFilter.value = state.officeMode;
  els.segmentFilter.value = state.segment;
  els.tkTypeFilter.value = state.tkType;
}

function render() {
  if (!state.rows.length) return;
  const latestRows = rowsForLatest();
  const subjectRows = subjectTrendRows();
  const latestSubject = subjectRows.at(-1);
  const previousSubject = subjectRows.at(-2);
  const latestValue = latestSubject ? displayValue(latestSubject) : 0;
  const previousValue = previousSubject ? displayValue(previousSubject) : null;
  const progress = previousValue === null ? null : latestValue - previousValue;
  renderTableOfficeChecklist(latestRows);
  const filteredTableRows = filterTableRows(latestRows);

  els.sourceNote.textContent = `Sheet KPI: ${fmtNumber.format(state.rows.length)} baris. Kolom pengurang: ${state.columns.value}.`;
  els.meta.textContent = `Update terakhir ${state.date}; ${fmtNumber.format(filteredTableRows.length)} kantor sesuai filter.`;
  els.latestValue.textContent = formatSigned(latestValue);
  els.latestInvalid.textContent = fmtNumber.format(totalInvalidAll(latestSubject));
  els.newInvalid.textContent = fmtNumber.format(newInvalid(latestSubject));
  els.oldInvalid.textContent = fmtNumber.format(oldInvalid(latestSubject));
  renderKpiProgress(els.latestValueProgress, previousSubject ? latestValue - previousValue : null, "score");
  renderKpiProgress(els.latestInvalidProgress, previousSubject ? totalInvalidAll(latestSubject) - totalInvalidAll(previousSubject) : null, "burden");
  renderKpiProgress(els.newInvalidProgress, previousSubject ? newInvalid(latestSubject) - newInvalid(previousSubject) : null, "burden");
  renderKpiProgress(els.oldInvalidProgress, previousSubject ? oldInvalid(latestSubject) - oldInvalid(previousSubject) : null, "burden");

  renderTrend(subjectRows);
  renderTrendResume(filteredTableRows);
  renderMovementAnalysis(latestRows);
  renderInsight(filteredTableRows, latestSubject, progress);
  renderTable(filteredTableRows);
}

function rowsForLatest() {
  return state.rows.filter((row) => row[state.columns.date] === state.date);
}

function subjectTrendRows() {
  const canUseKanwil = state.office === "ALL" && state.segment === "ALL";
  const rows = state.rows
    .filter((row) => {
      if (state.office !== "ALL") return readCode(row) === state.office;
      if (canUseKanwil) return readCode(row) === "905";
      return readCode(row) !== "905" && matchesSegment(row);
    })
    .sort((a, b) => parseDate(a[state.columns.date]) - parseDate(b[state.columns.date]));
  return compactTrendRows(rows);
}

function compactTrendRows(rows) {
  if (!rows.length) return [];
  const groupedRows = aggregateRowsByDate(rows);
  const latestMonth = monthKey(groupedRows.at(-1)?.[state.columns.date]);
  const previousMonths = new Map();
  const currentMonthRows = [];

  for (const row of groupedRows) {
    const key = monthKey(row[state.columns.date]);
    if (key === latestMonth) {
      currentMonthRows.push(row);
      continue;
    }
    const existing = previousMonths.get(key);
    if (!existing || parseDate(row[state.columns.date]) > parseDate(existing[state.columns.date])) {
      previousMonths.set(key, row);
    }
  }

  return [...previousMonths.values(), ...currentMonthRows]
    .sort((a, b) => parseDate(a[state.columns.date]) - parseDate(b[state.columns.date]));
}

function filterTableRows(rows) {
  return rows
    .filter((row) => readCode(row) !== "905")
    .filter(matchesSegment)
    .filter((row) => state.officeMode === "ALL" || matchesOfficeMode(readCode(row)))
    .filter((row) => state.office === "ALL" || readCode(row) === state.office)
    .filter((row) => !state.tableOffices.length || state.tableOffices.includes(readCode(row)))
    .sort(compareTableRows);
}

function tableOfficeOptionRows(rows) {
  return rows
    .filter((row) => readCode(row) !== "905")
    .filter(matchesSegment)
    .filter((row) => state.officeMode === "ALL" || matchesOfficeMode(readCode(row)))
    .filter((row) => state.office === "ALL" || readCode(row) === state.office);
}

function renderTableOfficeChecklist(rows) {
  const offices = tableOfficeOptionRows(rows)
    .map((row) => ({ value: readCode(row), label: `${readCode(row)} - ${readName(row)}` }))
    .filter((office, index, list) => list.findIndex((item) => item.value === office.value) === index)
    .sort((a, b) => a.value.localeCompare(b.value, "id", { numeric: true }));
  const validCodes = new Set(offices.map((office) => office.value));
  state.tableOffices = state.tableOffices.filter((code) => validCodes.has(code));
  const label = !state.tableOffices.length
    ? "Semua Kantor"
    : state.tableOffices.length === 1
      ? offices.find((office) => office.value === state.tableOffices[0])?.label ?? state.tableOffices[0]
      : `${state.tableOffices.length} kantor dipilih`;
  els.officeChecklistButton.textContent = label;
  els.officeChecklistMenu.innerHTML = `
    <label class="check-option">
      <input type="checkbox" value="ALL" ${state.tableOffices.length ? "" : "checked"} />
      <span>Semua Kantor</span>
    </label>
    ${offices.map((office) => `
      <label class="check-option">
        <input type="checkbox" value="${escapeHtml(office.value)}" ${state.tableOffices.includes(office.value) ? "checked" : ""} />
        <span>${escapeHtml(office.label)}</span>
      </label>
    `).join("")}
  `;
}

function renderTrend(rows) {
  if (!rows.length) {
    els.trendPanel.innerHTML = `<p class="empty">Tidak ada data trend.</p>`;
    if (els.trendResume) els.trendResume.innerHTML = "";
    return;
  }
  const values = rows.map(displayValue);
  const minValue = Math.min(...values, -1);
  const chart = buildNegativeLineChart(values, minValue);
  const currentMonth = monthKey(rows.at(-1)?.[state.columns.date]);
  const target = state.office === "ALL" ? "905 - Kanwil Jateng DIY" : `${state.office} - ${readName(rows.at(-1))}`;
  els.trendSubtitle.textContent = `${target}; ${segmentLabel()} | ${tkTypeLabel()}; bulan sebelumnya memakai tanggal maksimum, bulan berjalan tampil semua tanggal.`;
  els.trendPanel.innerHTML = `
    <section class="trend-card combined">
      <div class="trend-chart combined">
        <svg viewBox="0 0 720 260" role="img" aria-label="Trend pengurang KPI NIK invalid">
          <line class="grid" x1="52" y1="26" x2="52" y2="206"></line>
          <line class="grid" x1="52" y1="26" x2="688" y2="26"></line>
          <line class="grid" x1="52" y1="206" x2="688" y2="206"></line>
          <text x="30" y="30">0</text>
          <text x="10" y="210">${escapeHtml(formatSigned(minValue))}</text>
          <polyline class="line line-1" points="${chart.polyline}"></polyline>
          ${chart.points.map((point, index) => `
            <circle class="dot dot-1" cx="${point.x}" cy="${point.y}" r="3">
              <title>${escapeHtml(trendDateLabel(rows[index][state.columns.date], currentMonth))}: ${escapeHtml(formatSigned(values[index]))}</title>
            </circle>
            <text class="value-label value-label-1" x="${point.x}" y="${point.y - 9}" text-anchor="middle">${escapeHtml(formatSigned(values[index]))}</text>
            ${index > 0 ? `
              <text class="growth-label ${nikGrowthClass(values[index] - values[index - 1])}" x="${point.x}" y="${nikGrowthLabelY(point)}" text-anchor="middle">${escapeHtml(formatSigned(values[index] - values[index - 1]))}</text>
            ` : ""}
          `).join("")}
          ${rows.map((row, index) => {
            const point = chart.points[index];
            return `<text class="date-label" x="${point.x}" y="238" text-anchor="${index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"}">${escapeHtml(trendDateLabel(row[state.columns.date], currentMonth))}</text>`;
          }).join("")}
        </svg>
      </div>
    </section>
  `;
}

function renderTrendResume(rows) {
  if (!els.trendResume) return;
  if (!rows.length) {
    els.trendResume.innerHTML = "";
    return;
  }
  const items = rows.map((row) => ({
    row,
    progress: getOfficeInvalidProgress(row),
  }));
  const topReduction = items
    .filter((item) => item.progress !== null && item.progress < 0)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 5);
  const noReduction = items
    .filter((item) => item.progress === null || item.progress >= 0)
    .sort((a, b) => progressSortValue(b.progress) - progressSortValue(a.progress))
    .slice(0, 5);

  els.trendResume.innerHTML = `
    <div class="trend-resume-grid">
      ${renderTrendResumeTable("5 Cabang Progres Tertinggi", topReduction)}
      ${renderTrendResumeTable("5 Cabang Progres Terendah", noReduction)}
    </div>
  `;
}

function renderTrendResumeTable(title, items) {
  const body = items.length
    ? items.map((item) => `
      <tr>
        <td>${escapeHtml(readCode(item.row))}</td>
        <td>${escapeHtml(readName(item.row))}</td>
        <td class="num">${renderProgressTag(item.progress)}</td>
      </tr>
    `).join("")
    : `<tr><td class="empty" colspan="3">Tidak ada data.</td></tr>`;
  return `
    <section class="trend-resume-card">
      <h3>${escapeHtml(title)}</h3>
      <table>
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama Cabang</th>
            <th class="num">+/-</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>
  `;
}

function renderProgressTag(progress) {
  if (progress === null) return `<span class="tag neutral">-</span>`;
  const tagClass = progress < 0 ? "good" : progress > 0 ? "bad" : "neutral";
  return `<span class="tag ${tagClass}">${escapeHtml(formatSigned(progress))}</span>`;
}

function progressSortValue(progress) {
  return progress === null ? -Infinity : progress;
}

function renderMovementAnalysis(latestRows) {
  if (!els.movementPanel) return;
  const rows = movementBaseRows(latestRows);
  const officeMovements = buildOfficeMovementRows(rows);
  const previousDate = previousUpdateDate(state.date);
  if (!rows.length || !previousDate) {
    els.movementSubtitle.textContent = "Belum ada data pembanding.";
    els.movementPanel.innerHTML = `<p class="empty">Belum cukup data untuk analisis pergerakan.</p>`;
    return;
  }
  const latestDate = state.date;
  const segmentRows = buildSegmentMovement(officeMovements);
  const topIncrease = officeMovements
    .filter((item) => item.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
  const totalDelta = officeMovements.reduce((sum, item) => sum + item.delta, 0);
  const newDelta = officeMovements.reduce((sum, item) => sum + item.newDelta, 0);
  const oldDelta = officeMovements.reduce((sum, item) => sum + item.oldDelta, 0);
  const subjectRows = subjectTrendRows();
  const currentSubject = subjectRows.at(-1);
  const previousSubject = subjectRows.at(-2);
  const scoreDelta = currentSubject && previousSubject
    ? displayValue(currentSubject) - displayValue(previousSubject)
    : officeMovements.reduce((sum, item) => sum + item.valueDelta, 0);
  const currentPenalty = currentSubject
    ? displayValue(currentSubject)
    : officeMovements.reduce((sum, item) => sum + item.value, 0);
  const movementNarrative = buildKpiMovementNarrative({
    previousDate,
    latestDate,
    totalDelta,
    scoreDelta,
    currentPenalty,
    driver: pickKpiMovementDriver(officeMovements, totalDelta),
  });

  els.movementSubtitle.textContent = `${previousDate} ke ${latestDate}; mengikuti filter Cabang, Segmen, Jenis TK, Mode Tabel, dan pilihan kantor.`;
  els.movementPanel.innerHTML = `
    <p class="movement-cause movement-narrative">${movementNarrative}</p>
    <section class="movement-summary">
      <div>
        <span>Perubahan Beban</span>
        <strong class="${totalDelta > 0 ? "bad-text" : totalDelta < 0 ? "good-text" : ""}">${escapeHtml(formatSigned(totalDelta))}</strong>
      </div>
      <div>
        <span>TK Baru</span>
        <strong class="${newDelta > 0 ? "bad-text" : newDelta < 0 ? "good-text" : ""}">${escapeHtml(formatSigned(newDelta))}</strong>
      </div>
      <div>
        <span>TK Lama</span>
        <strong class="${oldDelta > 0 ? "bad-text" : oldDelta < 0 ? "good-text" : ""}">${escapeHtml(formatSigned(oldDelta))}</strong>
      </div>
      <div>
        <span>Nilai KPI</span>
        <strong class="${scoreDelta > 0 ? "good-text" : scoreDelta < 0 ? "bad-text" : ""}">${escapeHtml(formatSigned(scoreDelta))}</strong>
      </div>
    </section>
    <div class="movement-grid">
      <section>
        <h3>Segmen</h3>
        <table>
          <thead>
            <tr>
              <th>Segmen</th>
              <th class="num">Beban</th>
              <th class="num">+/-</th>
            </tr>
          </thead>
          <tbody>
            ${segmentRows.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.segment)}</strong></td>
                <td class="num">${fmtNumber.format(item.latest)}</td>
                <td class="num">${renderProgressTag(item.delta)}</td>
              </tr>
            `).join("") || `<tr><td class="empty" colspan="3">Tidak ada data.</td></tr>`}
          </tbody>
        </table>
      </section>
      <section>
        <h3>Penyumbang Kenaikan Terbesar</h3>
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Segmen</th>
              <th class="num">+/-</th>
            </tr>
          </thead>
          <tbody>
            ${topIncrease.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.code)}</strong></td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.segment)}</td>
                <td class="num">${renderProgressTag(item.delta)}</td>
              </tr>
            `).join("") || `<tr><td class="empty" colspan="4">Tidak ada kenaikan beban.</td></tr>`}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function buildKpiMovementNarrative({ previousDate, latestDate, totalDelta, scoreDelta, currentPenalty, driver }) {
  const dayCount = countBusinessDays(previousDate, latestDate);
  const burdenDirection = totalDelta < 0
    ? "terjadi penurunan beban total sebanyak"
    : totalDelta > 0
      ? "terjadi kenaikan beban total sebanyak"
      : "beban total tidak berubah sebesar";
  const penaltyDirection = scoreDelta > 0
    ? "membaik"
    : scoreDelta < 0
      ? "memburuk"
      : "tetap";
  const driverDirection = driver?.delta < 0 ? "Penurunan" : driver?.delta > 0 ? "Kenaikan" : "Pergerakan";
  const driverClass = driver?.delta < 0 ? "burden-down" : driver?.delta > 0 ? "burden-up" : "";
  const driverText = driver
    ? `${driverDirection} terbanyak ada di cabang <strong class="${driverClass}">${escapeHtml(driver.code)} - ${escapeHtml(driver.name)}</strong> dengan ${driver.delta < 0 ? "penurunan" : "kenaikan"} sebanyak <strong class="${driverClass}">${formatSigned(driver.delta)}</strong>.`
    : "Belum ada cabang dominan yang terbaca pada filter ini.";
  return `
    Progres dari tanggal <strong>${escapeHtml(formatFullDate(previousDate))}</strong>
    s.d. <strong>${escapeHtml(formatFullDate(latestDate))}</strong>
    (<strong>${fmtNumber.format(dayCount)} hari kerja</strong>), ${burdenDirection}
    <strong>${formatSigned(totalDelta)}</strong>, sehingga pengurang KPI ${penaltyDirection}
    menjadi <strong>${formatSigned(currentPenalty)}</strong> (${formatSigned(scoreDelta)} poin menuju 0).
    ${driverText}
  `;
}

function pickKpiMovementDriver(items, totalDelta) {
  if (!items.length) return null;
  if (totalDelta < 0) return [...items].filter((item) => item.delta < 0).sort((a, b) => a.delta - b.delta)[0] ?? null;
  if (totalDelta > 0) return [...items].filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta)[0] ?? null;
  return [...items].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null;
}

function movementBaseRows(latestRows) {
  return latestRows
    .filter((row) => readCode(row) !== "905")
    .filter(matchesSegment)
    .filter((row) => state.officeMode === "ALL" || matchesOfficeMode(readCode(row)))
    .filter((row) => state.office === "ALL" || readCode(row) === state.office)
    .filter((row) => !state.tableOffices.length || state.tableOffices.includes(readCode(row)));
}

function buildOfficeMovementRows(rows) {
  return rows.map((row) => {
    const previous = getPreviousOfficeRow(row);
    return {
      code: readCode(row),
      name: readName(row),
      segment: segmentFromRow(row) || "-",
      latest: rawInvalid(row),
      previous: previous ? rawInvalid(previous) : 0,
      delta: previous ? rawInvalid(row) - rawInvalid(previous) : rawInvalid(row),
      value: displayValue(row),
      newDelta: previous ? newInvalid(row) - newInvalid(previous) : newInvalid(row),
      oldDelta: previous ? oldInvalid(row) - oldInvalid(previous) : oldInvalid(row),
      valueDelta: previous ? displayValue(row) - displayValue(previous) : displayValue(row),
      activeTkDelta: previous ? activeTk(row) - activeTk(previous) : activeTk(row),
    };
  });
}

function buildSegmentMovement(items) {
  const grouped = new Map();
  for (const item of items) {
    const current = grouped.get(item.segment) ?? { segment: item.segment, latest: 0, previous: 0, delta: 0 };
    current.latest += item.latest;
    current.previous += item.previous;
    current.delta += item.delta;
    grouped.set(item.segment, current);
  }
  return [...grouped.values()].sort((a, b) => b.delta - a.delta);
}

function previousUpdateDate(dateValue) {
  return uniqueValues(state.rows, state.columns.date)
    .filter((date) => parseDate(date) < parseDate(dateValue))
    .sort(compareDateDesc)[0] ?? "";
}

function renderInsight(rows, latestSubject, progress) {
  if (!rows.length) {
    els.insightPanel.innerHTML = `<p class="empty">Tidak ada data kantor untuk filter aktif.</p>`;
    return;
  }
  const topItems = [...rows].sort((a, b) => rawInvalid(b) - rawInvalid(a)).slice(0, 5);
  const totalInvalid = rows.reduce((sum, row) => sum + rawInvalid(row), 0);
  const top = topItems[0];
  const prediction = buildCompletionPrediction(subjectTrendRows());
  const trendText = progress === null
    ? "Belum ada pembanding update sebelumnya."
    : progress > 0
      ? `Membaik ${fmtDecimal.format(progress)} poin menuju 0 dibanding update sebelumnya.`
      : progress < 0
        ? `Memburuk ${fmtDecimal.format(Math.abs(progress))} poin, perlu akselerasi validasi NIK.`
        : "Tidak berubah dibanding update sebelumnya.";
  els.insightSubtitle.textContent = `Total NIK invalid filter aktif: ${fmtNumber.format(totalInvalid)}.`;
  els.insightPanel.innerHTML = `
    <section class="resume-group simple">
      <h3>Quick Win Menuju 0</h3>
      <div class="resume-paragraph">
        <p><strong>Kerjakan dulu:</strong> fokus ke <strong>${escapeHtml(readCode(top))} - ${escapeHtml(readName(top))}</strong> karena masih memiliki <strong>${fmtNumber.format(rawInvalid(top))} NIK invalid</strong>.</p>
        <p>${escapeHtml(trendText)}</p>
        <p>Langkah cepat: tarik daftar TK dengan NIK invalid, pisahkan kasus kosong/format tidak 16 digit/duplikasi, hubungi pembina atau perusahaan untuk perbaikan NIK, lalu monitoring ulang pada update berikutnya.</p>
        <p>Target 1 minggu: turunkan kantor prioritas terbesar dulu agar pengurang KPI bergerak mendekati <strong>0</strong>.</p>
        <p class="resume-prediction"><strong>Prediksi:</strong> ${renderCompletionPrediction(prediction)}</p>
      </div>
    </section>
    <section class="resume-group simple">
      <h3>5 Kantor Beban Terbesar</h3>
      <div class="resume-paragraph">
        ${topItems.map((row, index) => `<p>${index + 1}. <strong>${escapeHtml(readCode(row))} - ${escapeHtml(readName(row))}</strong>: <strong>${fmtNumber.format(rawInvalid(row))}</strong> NIK invalid.</p>`).join("")}
      </div>
    </section>
  `;
}

function renderTable(rows) {
  els.tableSubtitle.textContent = `${fmtNumber.format(rows.length)} kantor cocok pada update ${state.date}.`;
  els.tableHead.innerHTML = `
    <tr>
      ${renderSortTh("code", "Kode Kantor")}
      ${renderSortTh("name", "Nama Kantor")}
      ${renderSortTh("segment", "Segmen")}
      ${renderSortTh("invalid", "NIK Invalid", "num")}
      ${renderSortTh("progress", "Progress", "num")}
      ${renderSortTh("value", "Pengurang KPI", "num")}
    </tr>
  `;
  els.tableBody.innerHTML = rows.map((row) => {
    const invalid = rawInvalid(row);
    const progress = getOfficeInvalidProgress(row);
    const progressClass = progress === null || progress === 0 ? "neutral" : progress < 0 ? "good" : "bad";
    return `
      <tr>
        <td><strong>${escapeHtml(readCode(row))}</strong></td>
        <td>${escapeHtml(readName(row))}</td>
        <td>${escapeHtml(segmentFromRow(row) || "-")}</td>
        <td class="num">${fmtNumber.format(invalid)}</td>
        <td class="num"><span class="tag ${progressClass}">${progress === null ? "-" : `${progress > 0 ? "+" : ""}${fmtNumber.format(progress)}`}</span></td>
        <td class="num ${invalid ? "bad-text" : "good-text"}">${escapeHtml(formatSigned(displayValue(row)))}</td>
      </tr>
    `;
  }).join("");
}

function renderSortTh(key, label, className = "") {
  const isActive = state.tableSort.key === key;
  const arrow = !isActive ? "↕" : state.tableSort.direction === "asc" ? "↑" : "↓";
  return `
    <th${className ? ` class="${className}"` : ""}>
      <button class="sort-button ${isActive ? "active" : ""}" type="button" data-sort-key="${key}">
        ${escapeHtml(label)}
        <span>${arrow}</span>
      </button>
    </th>
  `;
}

function compareTableRows(a, b) {
  const direction = state.tableSort.direction === "asc" ? 1 : -1;
  const valueA = tableSortValue(a, state.tableSort.key);
  const valueB = tableSortValue(b, state.tableSort.key);
  if (typeof valueA === "string" || typeof valueB === "string") {
    return String(valueA).localeCompare(String(valueB), "id", { numeric: true }) * direction;
  }
  if (valueA === valueB) return readCode(a).localeCompare(readCode(b), "id", { numeric: true });
  return (valueA - valueB) * direction;
}

function tableSortValue(row, key) {
  if (key === "code") return readCode(row);
  if (key === "name") return readName(row);
  if (key === "segment") return segmentFromRow(row) || "";
  if (key === "progress") return getOfficeInvalidProgress(row) ?? 0;
  if (key === "value") return displayValue(row);
  return rawInvalid(row);
}

function downloadCsv() {
  const rows = filterTableRows(rowsForLatest());
  if (!rows.length) {
    showToast("Tidak ada data untuk didownload.");
    return;
  }
  const csv = [
    ["Kode Kantor", "Nama Kantor", "Segmen", "NIK Invalid", "Progress", "Pengurang KPI"].map(csvEscape).join(","),
    ...rows.map((row) => [
      readCode(row),
      readName(row),
      segmentFromRow(row) || "-",
      rawInvalid(row),
      getOfficeInvalidProgress(row) ?? "",
      formatSigned(displayValue(row)),
    ].map(csvEscape).join(",")),
  ].join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tk-nik-invalid-${state.date || "update"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildNegativeLineChart(values, minValue) {
  const width = 636;
  const height = 180;
  const left = 52;
  const top = 26;
  const denominator = Math.max(1, values.length - 1);
  const range = Math.max(1, Math.abs(minValue));
  const points = values.map((value, index) => ({
    x: left + (index / denominator) * width,
    y: top + (Math.abs(value) / range) * height,
  }));
  return {
    points,
    polyline: points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
  };
}

function buildCompletionPrediction(rows) {
  if (!rows.length) return { burden: 0, rate: null, reductionRate: null, increaseRate: null, days: null, projectedBurden: 0 };
  const latest = rawInvalid(rows.at(-1));
  const reductionRates = [];
  const increaseRates = [];
  for (let index = Math.max(1, rows.length - 4); index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    const dayDiff = Math.max(1, Math.round((parseDate(current[state.columns.date]) - parseDate(previous[state.columns.date])) / 86400000));
    const reduction = rawInvalid(previous) - rawInvalid(current);
    if (reduction > 0) {
      reductionRates.push(reduction / dayDiff);
    } else if (reduction < 0) {
      increaseRates.push(Math.abs(reduction) / dayDiff);
    }
  }
  const reductionRate = reductionRates.length ? average(reductionRates) : 0;
  const increaseRate = increaseRates.length ? average(increaseRates) : 0;
  const netRate = reductionRate - increaseRate;
  const rate = netRate > 0 ? netRate : null;
  const days = rate ? Math.ceil(latest / rate) : null;
  const projectedBurden = Math.max(0, latest - (netRate * 7));
  return { burden: latest, rate, reductionRate, increaseRate, days, projectedBurden };
}

function getOfficeInvalidProgress(row) {
  const previous = getPreviousOfficeRow(row);
  if (!previous) return null;
  return rawInvalid(row) - rawInvalid(previous);
}

function getPreviousOfficeRow(row) {
  const code = readCode(row);
  const currentTime = parseDate(row[state.columns.date]);
  return state.rows
    .filter((item) => readCode(item) === code)
    .filter((item) => parseDate(item[state.columns.date]) < currentTime)
    .filter(matchesSegment)
    .sort((a, b) => parseDate(b[state.columns.date]) - parseDate(a[state.columns.date]))[0] ?? null;
}

function renderCompletionPrediction(prediction) {
  if (prediction.burden <= 0) {
    return `beban sudah <strong>0</strong>, sehingga tidak ada pengurang KPI dari NIK invalid pada filter ini.`;
  }
  if (!prediction.rate) {
    const increaseText = prediction.increaseRate
      ? ` Beban juga rata-rata bertambah <strong>${fmtDecimal.format(prediction.increaseRate)} beban/hari</strong>, sehingga net progress belum positif.`
      : "";
    return `belum cukup pola penurunan bersih untuk menghitung hari selesai.${increaseText} Jika eksekusi disiplin, fokus 1 minggu diarahkan untuk menurunkan <strong>${fmtNumber.format(prediction.burden)}</strong> beban tersisa dan menahan beban baru agar tidak naik lagi.`;
  }
  return `dengan rata-rata penurunan <strong>${fmtDecimal.format(prediction.reductionRate)} beban/hari</strong> dan kenaikan beban baru <strong>${fmtDecimal.format(prediction.increaseRate)} beban/hari</strong>, net progress menjadi <strong>${fmtDecimal.format(prediction.rate)} beban/hari</strong>. Beban diproyeksikan menjadi <strong>${fmtNumber.format(Math.round(prediction.projectedBurden))}</strong> dalam 1 minggu dan menuju 0 dalam sekitar <strong>${fmtNumber.format(prediction.days)} hari</strong>.`;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregateRowsByDate(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const date = row[state.columns.date];
    const current = grouped.get(date) ?? {
      [state.columns.date]: date,
      [state.columns.code]: state.office === "ALL" ? "905" : readCode(row),
      [state.columns.name]: state.office === "ALL" ? "KANWIL JATENG DAN DIY" : readName(row),
      __newInvalid: 0,
      __invalid: 0,
      __value: 0,
    };
    current.__newInvalid += parseNumber(row[state.columns.newInvalid]);
    current.__invalid += parseNumber(row[state.columns.invalid]);
    current.__value += Math.abs(parseNumber(row[state.columns.value]));
    grouped.set(date, current);
  }
  return [...grouped.values()].sort((a, b) => parseDate(a[state.columns.date]) - parseDate(b[state.columns.date]));
}

function rawInvalid(row) {
  const total = totalInvalidAll(row);
  const newly = newInvalid(row);
  if (state.tkType === "NEW") return newly;
  if (state.tkType === "OLD") return Math.max(0, total - newly);
  return total;
}

function totalInvalidAll(row) {
  if (!row) return 0;
  return row.__invalid ?? Math.abs(parseNumber(row[state.columns.invalid]));
}

function newInvalid(row) {
  if (!row) return 0;
  return row.__newInvalid ?? Math.abs(parseNumber(row[state.columns.newInvalid]));
}

function oldInvalid(row) {
  return Math.max(0, totalInvalidAll(row) - newInvalid(row));
}

function activeTk(row) {
  if (!row) return 0;
  return parseNumber(row.tk_aktif ?? row["TK_AKTIF"] ?? row["tk aktif"]);
}

function displayValue(row) {
  const totalInvalid = totalInvalidAll(row);
  const selectedInvalid = rawInvalid(row);
  const rawValue = row.__value ?? Math.abs(parseNumber(row[state.columns.value]));
  const selectedValue = totalInvalid ? rawValue * (selectedInvalid / totalInvalid) : rawValue;
  return selectedValue > 0 ? -selectedValue : selectedValue;
}

function renderKpiProgress(element, delta, mode) {
  if (!element) return;
  if (delta === null || delta === undefined) {
    element.className = "kpi-progress neutral";
    element.textContent = "Belum ada pembanding";
    return;
  }
  const threshold = mode === "score" ? 0.005 : 0;
  const isSame = Math.abs(delta) <= threshold;
  const isBetter = mode === "score" ? delta > threshold : delta < 0;
  const tone = isSame ? "neutral" : isBetter ? "good" : "bad";
  const icon = isSame ? "-" : mode === "score"
    ? isBetter ? "↑" : "↓"
    : isBetter ? "↓" : "↑";
  const label = isSame ? "tetap" : isBetter ? "membaik" : "memburuk";
  element.className = `kpi-progress ${tone}`;
  element.textContent = `${icon} ${formatSigned(delta)} ${label}`;
}

function readCode(row) {
  return String(row[state.columns.code] ?? "").trim();
}

function readName(row) {
  return String(row[state.columns.name] ?? "").trim() || "-";
}

function formatSigned(value) {
  const number = Number(value) || 0;
  if (number === 0) return "0";
  return number > 0 ? `+${fmtDecimal.format(number)}` : `-${fmtDecimal.format(Math.abs(number))}`;
}

function nikGrowthClass(delta) {
  if (Math.abs(delta) < 0.005) return "neutral";
  return delta > 0 ? "good" : "bad";
}

function nikGrowthLabelY(point) {
  const y = point.y > 186 ? point.y - 22 : point.y + 17;
  return Math.max(20, Math.min(222, y));
}

function matchesOfficeMode(code) {
  const officeClass = getOfficeClass(code);
  if (state.officeMode === "MAIN") return officeClass === "main";
  if (state.officeMode === "KCP") return officeClass === "kcp";
  return true;
}

function matchesSegment(row) {
  if (state.segment === "ALL") return true;
  return segmentFromRow(row) === state.segment;
}

function segmentFromRow(row) {
  const value = String(row[state.columns.segment] ?? "").trim();
  if (value === "3") return "PU";
  if (value === "4") return "BPU";
  return "";
}

function segmentLabel() {
  if (state.segment === "PU") return "Segmen PU";
  if (state.segment === "BPU") return "Segmen BPU";
  return "Semua Segmen";
}

function tkTypeLabel() {
  if (state.tkType === "NEW") return "TK Baru";
  if (state.tkType === "OLD") return "TK Lama";
  return "Semua TK";
}

function getOfficeClass(code) {
  const text = String(code ?? "").trim().toUpperCase();
  const match = text.match(/^L(\d{2})$/);
  if (!match) return "main";
  const number = Number(match[1]);
  if (number >= 12 && number <= 34) return "kcp";
  return "main";
}

function uniqueValues(rows, column) {
  return [...new Set(rows.map((row) => String(row[column] ?? "").trim()).filter(Boolean))];
}

function setOptions(select, options, selectedValue) {
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

function parseDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
  const parsed = new Date(text).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatFullDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}-${match[3]}`;
}

function countBusinessDays(startValue, endValue) {
  const startTime = parseDate(startValue);
  const endTime = parseDate(endValue);
  if (!startTime || !endTime) return 0;
  const start = new Date(Math.min(startTime, endTime));
  const end = new Date(Math.max(startTime, endTime));
  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function compareDateDesc(a, b) {
  return parseDate(b) - parseDate(a);
}

function monthKey(value) {
  const date = new Date(parseDate(value));
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function trendDateLabel(value, currentMonth) {
  const date = new Date(parseDate(value));
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  const key = monthKey(value);
  if (key !== currentMonth) return monthShortNames[date.getMonth()];
  return `${String(date.getDate()).padStart(2, "0")}-${monthShortNames[date.getMonth()]}`;
}

function parseNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") && !raw.includes(".")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/,/g, "");
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 3600);
}

els.officeFilter.addEventListener("change", (event) => {
  state.office = event.target.value;
  render();
});
els.officeModeFilter.addEventListener("change", (event) => {
  state.officeMode = event.target.value;
  render();
});
els.segmentFilter.addEventListener("change", (event) => {
  state.segment = event.target.value;
  render();
});
els.tkTypeFilter.addEventListener("change", (event) => {
  state.tkType = event.target.value;
  render();
});
els.resetFilters.addEventListener("click", () => {
  state.office = "ALL";
  state.officeMode = "ALL";
  state.segment = "ALL";
  state.tkType = "ALL";
  state.tableOffices = [];
  renderFilters();
  render();
});
els.downloadCsv.addEventListener("click", downloadCsv);
els.tableHead.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sort-key]");
  if (!button) return;
  const key = button.dataset.sortKey;
  if (state.tableSort.key === key) {
    state.tableSort.direction = state.tableSort.direction === "asc" ? "desc" : "asc";
  } else {
    state.tableSort = { key, direction: key === "name" || key === "code" || key === "segment" ? "asc" : "desc" };
  }
  render();
});
els.officeChecklistButton.addEventListener("click", () => {
  els.officeChecklistMenu.hidden = !els.officeChecklistMenu.hidden;
});
els.officeChecklistMenu.addEventListener("change", (event) => {
  const value = event.target.value;
  if (value === "ALL") {
    state.tableOffices = [];
  } else if (event.target.checked) {
    state.tableOffices = [...new Set([...state.tableOffices, value])];
  } else {
    state.tableOffices = state.tableOffices.filter((code) => code !== value);
  }
  render();
  els.officeChecklistMenu.hidden = false;
});
document.addEventListener("click", (event) => {
  if (!els.officeChecklist.contains(event.target)) {
    els.officeChecklistMenu.hidden = true;
  }
});

loadKpiNik();
