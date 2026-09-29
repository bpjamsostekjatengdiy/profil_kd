const SHEET_ID = "2PACX-1vQtw4zahkq1MPDzwQJDjWRDdUN4ffG8O4aokdiIBvxh_YKvxnQ6-hNpTQXkQoidX8TrHZ0bku-VJE4K";
const SHEETS = {
  igi: {
    gid: "0",
    label: "IGI",
  },
  kpi: {
    gid: "315150517",
    label: "KPI",
  },
};

const metrics = [
  { key: "dup_na", label: "DUP NA", burden: "beban_dup_na", start: "awal_dup_na", realization: "realisasi_dup_na", percent: "persen_dup_na", score: "nilai_dup_na" },
  { key: "kel_tk_aktif", label: "Kelengkapan TK Aktif", burden: "beban_kel_tk_aktif", start: "awal_kel_tk_aktif", realization: "realisasi_kel_tk_aktif", percent: "persen_kel_tk_aktif", score: "nilai_kel_tk_aktif" },
  { key: "kel_tk_na", label: "Kelengkapan TK NA", burden: "beban_kel_tk_na", start: "awal_kel_tk_na", realization: "realisasi_kel_tk_na", percent: "persen_kel_tk_na", score: "nilai_kel_tk_na" },
  { key: "kel_pkbu", label: "Kelengkapan PKBU", burden: "beban_kel_pkbu", start: "awal_kel_pkbu", realization: "realisasi_kel_pkbu", percent: "persen_kel_pkbu", score: "nilai_kel_pkbu" },
];

const tableComponentOptions = [
  { key: "burden", label: "Sisa" },
  { key: "progress", label: "+/-" },
  { key: "percent", label: "%" },
  { key: "score", label: "Score" },
];

const maxScores = {
  dup_na: { main: 5, kcp: 6 },
  kel_tk_aktif: { main: 9, kcp: 11 },
  kel_tk_na: { main: 4, kcp: 5 },
  kel_pkbu: { main: 2, kcp: 3 },
};

const state = {
  igiRows: [],
  kpiRows: [],
  date: "LATEST",
  office: "ALL",
  officeMode: "ALL",
  metric: "TOTAL_SCORE",
  trendStart: "",
  trendEnd: "",
  search: "",
  tableSort: { key: "nilai_total", direction: "desc" },
  tableMetrics: [...metrics.map((metric) => metric.key), "nilai_total"],
  tableComponents: ["burden", "progress", "percent", "score"],
};

const els = {
  sourceNote: document.querySelector("#progressSourceNote"),
  meta: document.querySelector("#progressMeta"),
  officeModeFilter: document.querySelector("#progressOfficeModeFilter"),
  officeFilter: document.querySelector("#progressOfficeFilter"),
  metricFilter: document.querySelector("#progressMetricFilter"),
  resetFilters: document.querySelector("#resetProgressFilters"),
  latestDate: document.querySelector("#progressLatestDate"),
  totalBurden: document.querySelector("#progressTotalBurden"),
  realization: document.querySelector("#progressRealization"),
  score: document.querySelector("#progressScore"),
  trendStart: document.querySelector("#trendStartDate"),
  trendEnd: document.querySelector("#trendEndDate"),
  trendSubtitle: document.querySelector("#trendSubtitle"),
  trendCards: document.querySelector("#trendCards"),
  igiSubtitle: document.querySelector("#igiSubtitle"),
  igiCards: document.querySelector("#igiCards"),
  tableSubtitle: document.querySelector("#progressTableSubtitle"),
  tableCapture: document.querySelector("#progressTableCapture"),
  tableHead: document.querySelector("#progressTableHead"),
  tableBody: document.querySelector("#progressTableBody"),
  metricColumns: document.querySelector("#progressMetricColumns"),
  metricColumnsButton: document.querySelector("#progressMetricColumnsButton"),
  metricColumnsMenu: document.querySelector("#progressMetricColumnsMenu"),
  componentColumns: document.querySelector("#progressComponentColumns"),
  componentColumnsButton: document.querySelector("#progressComponentColumnsButton"),
  componentColumnsMenu: document.querySelector("#progressComponentColumnsMenu"),
  parameterResumeSubtitle: document.querySelector("#parameterResumeSubtitle"),
  parameterResume: document.querySelector("#parameterResume"),
  copyParameterResume: document.querySelector("#copyParameterResume"),
  searchInput: document.querySelector("#progressSearchInput"),
  downloadTableCsv: document.querySelector("#downloadProgressTableCsv"),
  downloadTableJpg: document.querySelector("#downloadProgressTableJpg"),
  toast: document.querySelector("#toast"),
};

const fmtNumber = new Intl.NumberFormat("id-ID");
const fmtDecimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmtTwoDecimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLongNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function sheetCsvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${gid}&single=true&output=csv`;
}

async function loadProgress() {
  setLoading(true);
  try {
    const [igiText, kpiText] = await Promise.all([
      fetchCsv(sheetCsvUrl(SHEETS.igi.gid)),
      fetchCsv(sheetCsvUrl(SHEETS.kpi.gid)),
    ]);
    state.igiRows = parseCsv(igiText);
    state.kpiRows = parseCsv(kpiText);
    renderFilters();
    render();
    showToast("Data progress berhasil diperbarui.");
  } catch (error) {
    els.meta.textContent = "Gagal membaca spreadsheet. Coba refresh kembali.";
    showToast(error.message);
  } finally {
    setLoading(false);
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

function renderFilters() {
  const dates = uniqueValues(state.igiRows, "tgl_proses").sort(compareDateDesc);
  const latest = dates[0] ?? "";
  if (state.date === "LATEST" || !dates.includes(state.date)) state.date = latest;
  const ascendingDates = [...dates].sort((a, b) => parseDate(a) - parseDate(b));
  const firstDate = ascendingDates[0] ?? "";
  if (!state.trendStart || !dates.includes(state.trendStart)) state.trendStart = firstDate;
  if (!state.trendEnd || !dates.includes(state.trendEnd)) state.trendEnd = latest;

  if (els.officeModeFilter) els.officeModeFilter.value = state.officeMode;
  setOptions(els.metricFilter, [
    { value: "TOTAL_SCORE", label: "Total Score" },
    { value: "ALL", label: "Semua Indikator" },
    ...metrics.map((item) => ({ value: item.key, label: item.label })),
  ], state.metric);
  setDateInputLimits(els.trendStart, ascendingDates, state.trendStart);
  setDateInputLimits(els.trendEnd, ascendingDates, state.trendEnd);

  const officeRows = state.igiRows
    .filter((row) => row.tgl_proses === state.date && row.kode_kantor !== "905");
  const offices = officeRows
    .map((row) => ({ value: row.kode_kantor, label: `${row.kode_kantor} - ${row.nama_kantor}` }))
    .sort((a, b) => a.value.localeCompare(b.value, "id", { numeric: true }));
  if (state.office !== "ALL" && !offices.some((office) => office.value === state.office)) state.office = "ALL";
  setOptions(els.officeFilter, [{ value: "ALL", label: "Semua Kantor" }, ...offices], state.office);
}

function render() {
  if (!state.igiRows.length && !state.kpiRows.length) {
    renderEmpty();
    return;
  }

  const latestDate = state.date || uniqueValues(state.igiRows, "tgl_proses").sort(compareDateDesc)[0] || "-";
  const igiForDate = state.igiRows.filter((row) => row.tgl_proses === latestDate);
  const kanwil = igiForDate.find((row) => row.kode_kantor === "905") ?? igiForDate[0] ?? {};
  const activeOfficeRow = state.office === "ALL"
    ? kanwil
    : igiForDate.find((row) => row.kode_kantor === state.office) ?? kanwil;
  const selectedMetrics = state.metric === "ALL" || state.metric === "TOTAL_SCORE" ? metrics : metrics.filter((item) => item.key === state.metric);

  if (els.latestDate) els.latestDate.textContent = latestDate;
  if (els.totalBurden) els.totalBurden.textContent = fmtNumber.format(sumMetrics(kanwil, selectedMetrics, "burden"));
  if (els.realization) els.realization.textContent = fmtNumber.format(sumMetrics(kanwil, selectedMetrics, "realization"));
  if (els.score) els.score.textContent = formatNumber(kanwil.nilai);
  els.sourceNote.textContent = `Spreadsheet KUALITAS DATA 2026: ${fmtNumber.format(state.igiRows.length)} baris IGI dan ${fmtNumber.format(state.kpiRows.length)} baris KPI.`;
  els.meta.textContent = `Update terpilih ${latestDate}; ${fmtNumber.format(igiForDate.length)} kantor pada tab IGI.`;

  renderIgiCards(activeOfficeRow, selectedMetrics);
  renderTrend(selectedMetrics);
  renderTableColumnFilters();
  renderTable(igiForDate, selectedMetrics);
  renderParameterResume(igiForDate, selectedMetrics);
}

function renderTableColumnFilters() {
  if (!els.metricColumnsMenu || !els.componentColumnsMenu) return;
  const metricOptions = [
    ...metrics.map((metric) => ({ key: metric.key, label: metric.label })),
    { key: "nilai_total", label: "Nilai" },
  ];
  els.metricColumnsButton.textContent = tableSelectionLabel(state.tableMetrics, metricOptions.length, "Semua Parameter", "Parameter");
  els.metricColumnsMenu.innerHTML = metricOptions.map((option) => `
    <label class="check-option">
      <input type="checkbox" value="${escapeHtml(option.key)}" ${state.tableMetrics.includes(option.key) ? "checked" : ""} />
      <span>${escapeHtml(option.label)}</span>
    </label>
  `).join("");

  els.componentColumnsButton.textContent = tableSelectionLabel(state.tableComponents, tableComponentOptions.length, "Semua Agregat", "Agregat");
  els.componentColumnsMenu.innerHTML = tableComponentOptions.map((option) => `
    <label class="check-option">
      <input type="checkbox" value="${escapeHtml(option.key)}" ${state.tableComponents.includes(option.key) ? "checked" : ""} />
      <span>${escapeHtml(option.label)}</span>
    </label>
  `).join("");
}

function tableSelectionLabel(selected, total, allLabel, partialLabel) {
  if (selected.length >= total) return allLabel;
  if (!selected.length) return `${partialLabel}: tidak ada`;
  return `${partialLabel}: ${fmtNumber.format(selected.length)}`;
}

function renderIgiCards(row, selectedMetrics) {
  if (!row?.tgl_proses) {
    els.igiCards.innerHTML = `<p class="empty">Belum ada data IGI.</p>`;
    return;
  }
  const previousRow = getPreviousIgiRow(row);
  const officeClass = getOfficeClass(row.kode_kantor);
  els.igiSubtitle.textContent = `${row.nama_kantor ?? "Kanwil"} | ${officeClass.label} | BLTH ${row.blth_proses ?? "-"} | Update ${row.tgl_proses ?? "-"}`;
  els.igiCards.innerHTML = `
    ${renderTotalScoreCard(row, previousRow)}
    ${selectedMetrics.map((metric) => `
    <div class="progress-card">
      <div class="progress-card-title">
        <strong>${escapeHtml(metric.label)}</strong>
        ${renderDeltaBadge(row, previousRow, metric)}
      </div>
      <div class="achievement">
        <div class="achievement-head">
          <span>Capaian</span>
          <b>${formatNumber(row[metric.percent])}%</b>
        </div>
        <i><em style="width:${Math.max(0, Math.min(100, parseNumber(row[metric.percent])))}%"></em></i>
      </div>
      <dl>
        <div class="start-cell"><dt>Awal</dt><dd>${fmtNumber.format(parseNumber(row[metric.start]))}</dd></div>
        <div class="${getBurdenCellClass(row, metric)}"><dt>Beban</dt><dd>${fmtNumber.format(parseNumber(row[metric.burden]))}</dd></div>
        <div class="${getRealizationCellClass(row, metric)}"><dt>Realisasi</dt><dd>${fmtNumber.format(parseNumber(row[metric.realization]))}</dd></div>
        <div class="score-cell" style="${getScoreCellStyle(parseNumber(row[metric.score]), getMaxScore(metric.key, row.kode_kantor))}"><dt>Nilai</dt><dd>${formatNumber(row[metric.score])} dari ${fmtNumber.format(getMaxScore(metric.key, row.kode_kantor))}</dd></div>
        ${renderBurdenMovement(row, previousRow, metric)}
      </dl>
    </div>
  `).join("")}
  `;
}

function renderTotalScoreCard(row, previousRow) {
  const maxScore = getTotalMaxScore(row.kode_kantor);
  const currentScore = parseNumber(row.nilai);
  const scorePercent = maxScore ? (currentScore / maxScore) * 100 : 0;
  const totalBurden = sumMetrics(row, metrics, "burden");
  const totalStart = sumMetrics(row, metrics, "start");
  const totalRealization = sumMetrics(row, metrics, "realization");
  const previousScore = previousRow ? parseNumber(previousRow.nilai) : null;
  const deltaScore = previousScore === null ? 0 : currentScore - previousScore;
  const previousBurden = previousRow ? sumMetrics(previousRow, metrics, "burden") : null;
  const burdenDelta = previousBurden === null ? null : totalBurden - previousBurden;
  const burdenMovementClass = burdenDelta === null || burdenDelta === 0 ? "neutral" : burdenDelta < 0 ? "good" : "bad";
  const burdenMovementText = burdenDelta === null
    ? "Belum ada pembanding"
    : burdenDelta < 0
      ? `-${fmtNumber.format(Math.abs(burdenDelta))}`
      : burdenDelta > 0
        ? `+${fmtNumber.format(burdenDelta)}`
        : "0";

  return `
    <div class="progress-card total-score-card">
      <div class="progress-card-title">
        <strong>Total Score</strong>
        ${previousRow ? `<span class="delta ${deltaScore >= 0 ? "good" : "bad"}">${deltaScore >= 0 ? "+" : ""}${fmtDecimal.format(deltaScore)} nilai</span>` : `<span class="delta neutral">Awal</span>`}
      </div>
      <div class="total-score-hero">
        <div class="score-main" style="${getScoreCellStyle(currentScore, maxScore)}">
          <span>Score Terakhir</span>
          <strong>${fmtDecimal.format(currentScore)}</strong>
          <small>dari ${fmtNumber.format(maxScore)}</small>
        </div>
        <div class="score-side burden">
          <span>Sisa Beban</span>
          <strong>${fmtNumber.format(totalBurden)}</strong>
        </div>
        <div class="score-side movement ${burdenMovementClass}">
          <span>Progress Beban</span>
          <strong>${burdenMovementText}</strong>
        </div>
      </div>
      <div class="achievement">
        <div class="achievement-head">
          <span>Capaian Nilai</span>
          <b>${fmtDecimal.format(currentScore)} dari ${fmtNumber.format(maxScore)}</b>
        </div>
        <i><em style="width:${Math.max(0, Math.min(100, scorePercent))}%"></em></i>
      </div>
      <dl>
        <div class="start-cell"><dt>Total awal</dt><dd>${fmtNumber.format(totalStart)}</dd></div>
        <div class="${totalBurden <= 0 || currentScore >= maxScore ? "burden-cell complete" : "burden-cell"}"><dt>Total beban</dt><dd>${fmtNumber.format(totalBurden)}</dd></div>
        <div class="${totalRealization <= totalStart ? "realization-cell good" : "realization-cell bad"}"><dt>Realisasi</dt><dd>${fmtNumber.format(totalRealization)}</dd></div>
        <div class="score-cell" style="${getScoreCellStyle(currentScore, maxScore)}"><dt>Nilai</dt><dd>${fmtDecimal.format(currentScore)} dari ${fmtNumber.format(maxScore)}</dd></div>
        ${renderTotalBurdenMovement(burdenDelta)}
      </dl>
    </div>
  `;
}

function getPreviousIgiRow(row) {
  const office = String(row.kode_kantor ?? "").trim();
  const currentTime = parseDate(row.tgl_proses);
  return state.igiRows
    .filter((item) => String(item.kode_kantor ?? "").trim() === office)
    .filter((item) => parseDate(item.tgl_proses) < currentTime)
    .sort((a, b) => parseDate(b.tgl_proses) - parseDate(a.tgl_proses))[0] ?? null;
}

function renderDeltaBadge(row, previousRow, metric) {
  if (!previousRow) return `<span class="delta neutral">Awal</span>`;
  const deltaPercent = parseNumber(row[metric.percent]) - parseNumber(previousRow[metric.percent]);
  const deltaScore = parseNumber(row[metric.score]) - parseNumber(previousRow[metric.score]);
  const direction = deltaPercent >= 0 ? "good" : "bad";
  const sign = deltaPercent >= 0 ? "+" : "";
  return `
    <span class="delta ${direction}" title="Perubahan dari update sebelumnya">
      ${sign}${fmtDecimal.format(deltaPercent)}% <small>nilai ${deltaScore >= 0 ? "+" : ""}${fmtDecimal.format(deltaScore)}</small>
    </span>
  `;
}

function renderBurdenMovement(row, previousRow, metric) {
  if (!previousRow) {
    return `<div class="movement neutral"><dt>Pergerakan beban</dt><dd>Belum ada pembanding</dd></div>`;
  }
  const currentBurden = parseNumber(row[metric.burden]);
  const previousBurden = parseNumber(previousRow[metric.burden]);
  const difference = currentBurden - previousBurden;
  const absDifference = Math.abs(difference);
  if (difference < 0) {
    return `<div class="movement good"><dt>Pergerakan beban</dt><dd>Berkurang ${fmtNumber.format(absDifference)}</dd></div>`;
  }
  if (difference > 0) {
    return `<div class="movement bad"><dt>Pergerakan beban</dt><dd>Bertambah ${fmtNumber.format(absDifference)}</dd></div>`;
  }
  return `<div class="movement neutral"><dt>Pergerakan beban</dt><dd>Tetap</dd></div>`;
}

function renderTotalBurdenMovement(difference) {
  if (difference === null) {
    return `<div class="movement neutral"><dt>Pergerakan beban</dt><dd>Belum ada pembanding</dd></div>`;
  }
  const absDifference = Math.abs(difference);
  if (difference < 0) {
    return `<div class="movement good"><dt>Pergerakan beban</dt><dd>Berkurang ${fmtNumber.format(absDifference)}</dd></div>`;
  }
  if (difference > 0) {
    return `<div class="movement bad"><dt>Pergerakan beban</dt><dd>Bertambah ${fmtNumber.format(absDifference)}</dd></div>`;
  }
  return `<div class="movement neutral"><dt>Pergerakan beban</dt><dd>Tetap</dd></div>`;
}

function getBurdenCellClass(row, metric) {
  const burden = parseNumber(row[metric.burden]);
  const percent = parseNumber(row[metric.percent]);
  return burden <= 0 || percent >= 100 ? "burden-cell complete" : "burden-cell";
}

function getRealizationCellClass(row, metric) {
  const start = parseNumber(row[metric.start]);
  const realization = parseNumber(row[metric.realization]);
  return realization <= start ? "realization-cell good" : "realization-cell bad";
}

function getScoreCellStyle(score, maxScore) {
  const ratio = maxScore ? Math.max(0, Math.min(1, score / maxScore)) : 0;
  if (score <= 0) {
    return "--score-bg:#fff1f1; --score-color:#b42318;";
  }
  const red = Math.round(180 - (180 - 15) * ratio);
  const green = Math.round(35 + (118 - 35) * ratio);
  const blue = Math.round(24 + (110 - 24) * ratio);
  const bgRed = Math.round(255 - (255 - 236) * ratio);
  const bgGreen = Math.round(241 + (253 - 241) * ratio);
  const bgBlue = Math.round(241 + (243 - 241) * ratio);
  return `--score-bg:rgb(${bgRed}, ${bgGreen}, ${bgBlue}); --score-color:rgb(${red}, ${green}, ${blue});`;
}

function getOfficeClass(code) {
  const text = String(code ?? "").trim().toUpperCase();
  if (text === "905") return { key: "kanwil", label: "Kanwil" };
  const match = text.match(/^L(\d{2})$/);
  if (!match) return { key: "main", label: "Cabang Induk" };
  const number = Number(match[1]);
  if (number >= 0 && number <= 11) return { key: "main", label: "Cabang Induk" };
  if (number >= 12 && number <= 34) return { key: "kcp", label: "KCP" };
  return { key: "main", label: "Cabang Induk" };
}

function matchesOfficeMode(row) {
  const officeClass = getOfficeClass(row.kode_kantor);
  if (state.officeMode === "MAIN") return officeClass.key === "main";
  if (state.officeMode === "KCP") return officeClass.key === "kcp";
  return true;
}

function getMaxScore(metricKey, officeCode) {
  const officeClass = getOfficeClass(officeCode);
  const rule = maxScores[metricKey];
  if (!rule) return 0;
  return officeClass.key === "kcp" ? rule.kcp : rule.main;
}

function getTotalMaxScore(officeCode) {
  return metrics.reduce((total, metric) => total + getMaxScore(metric.key, officeCode), 0);
}

function renderTrend(selectedMetrics) {
  const startTime = parseDate(state.trendStart);
  const endTime = parseDate(state.trendEnd);
  const minTime = Math.min(startTime, endTime);
  const maxTime = Math.max(startTime, endTime);
  const targetOffice = state.office === "ALL" ? "905" : state.office;
  const filteredRows = state.igiRows
    .filter((row) => row.kode_kantor === targetOffice)
    .filter((row) => {
      const rowTime = parseDate(row.tgl_proses);
      return rowTime >= minTime && rowTime <= maxTime;
    })
    .sort((a, b) => parseDate(a.tgl_proses) - parseDate(b.tgl_proses));
  const rows = compactTrendRows(filteredRows);
  const currentTrendMonth = monthKey(rows.at(-1)?.tgl_proses);

  const targetName = rows.at(-1)?.nama_kantor || (targetOffice === "905" ? "Kanwil Jateng DIY" : targetOffice);
  els.trendSubtitle.textContent = `${targetOffice} - ${targetName} | ${simpleDate(state.trendStart) || "-"} s.d. ${simpleDate(state.trendEnd) || "-"} | bulan sebelumnya tampil nama bulan, bulan berjalan tampil tanggal.`;

  if (!rows.length) {
    els.trendCards.innerHTML = `<p class="empty">Tidak ada data trend pada rentang tanggal dan kantor terpilih.</p>`;
    return;
  }

  const first = rows[0];
  const last = rows.at(-1);
  const series = state.metric === "TOTAL_SCORE"
    ? [{
      metric: { key: "total_score", label: "Total Score" },
      maxValue: getTotalMaxScore(targetOffice),
      chart: null,
      values: rows.map((row) => parseNumber(row.nilai)),
      colorIndex: 1,
      first: parseNumber(first.nilai),
      last: parseNumber(last.nilai),
      burden: sumMetrics(last, metrics, "burden"),
      score: parseNumber(last.nilai),
    }]
    : selectedMetrics.map((metric, index) => {
    const maxValue = getMaxScore(metric.key, targetOffice);
    const values = rows.map((row) => parseNumber(row[metric.score]));
    const finalRow = rows.at(-1);
    return {
      metric,
      maxValue,
      chart: null,
      values,
      colorIndex: index + 1,
      first: values[0] ?? 0,
      last: values.at(-1) ?? 0,
      burden: parseNumber(finalRow[metric.burden]),
      score: parseNumber(finalRow[metric.score]),
    };
  });
  const axisMax = Math.max(1, ...series.map((item) => item.maxValue));
  series.forEach((item) => {
    item.chart = buildLineChart(item.values, axisMax);
  });
  els.trendCards.innerHTML = `
    <section class="trend-card combined">
      <div class="trend-main">
        <div>
          <div class="trend-chart combined">
            <svg viewBox="0 0 720 260" role="img" aria-label="Trend capaian gabungan per parameter">
              <line class="grid" x1="52" y1="26" x2="52" y2="206"></line>
              <line class="grid" x1="52" y1="206" x2="688" y2="206"></line>
              <line class="grid muted" x1="52" y1="116" x2="688" y2="116"></line>
              <text x="20" y="31">${escapeHtml(formatPointAxis(axisMax))}</text>
              <text x="20" y="120">${escapeHtml(formatPointAxis(axisMax / 2))}</text>
              <text x="34" y="210">0</text>
              ${series.map((item) => `
                <polyline class="line line-${item.colorIndex}" points="${item.chart.polyline}"></polyline>
                ${item.chart.points.map((point, pointIndex) => `
                  <circle class="dot dot-${item.colorIndex}" cx="${point.x}" cy="${point.y}" r="3">
                    <title>${escapeHtml(item.metric.label)} | ${escapeHtml(trendDateLabel(rows[pointIndex].tgl_proses, currentTrendMonth))}: ${fmtDecimal.format(item.values[pointIndex])} poin</title>
                  </circle>
                  <text class="value-label value-label-${item.colorIndex}" x="${point.x}" y="${point.y - 9}" text-anchor="middle">${escapeHtml(compactValueLabel(item.values[pointIndex]))}</text>
                  ${pointIndex > 0 ? `
                    <text class="growth-label ${growthLabelClass(item.values[pointIndex] - item.values[pointIndex - 1])}" x="${point.x}" y="${trendGrowthLabelY(point, item.colorIndex, series.length)}" text-anchor="middle">${escapeHtml(formatGrowthLabel(item.values[pointIndex] - item.values[pointIndex - 1]))}</text>
                  ` : ""}
                `).join("")}
              `).join("")}
              ${rows.map((row, index) => {
                const point = series[0]?.chart.points[index];
                if (!point) return "";
                return `<text class="date-label" x="${point.x}" y="238" text-anchor="${index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"}">${escapeHtml(trendDateLabel(row.tgl_proses, currentTrendMonth))}</text>`;
              }).join("")}
            </svg>
          </div>
        </div>
      </div>
      ${renderQuickWinInsight(last, selectedMetrics)}
    </section>
  `;
}

function formatGrowthLabel(delta) {
  if (Math.abs(delta) < 0.005) return "0";
  return `${delta > 0 ? "+" : ""}${fmtDecimal.format(delta)}`;
}

function formatPointAxis(value) {
  return fmtDecimal.format(value);
}

function growthLabelClass(delta) {
  if (Math.abs(delta) < 0.005) return "neutral";
  return delta > 0 ? "good" : "bad";
}

function trendGrowthLabelY(point, colorIndex, seriesCount) {
  const offset = seriesCount > 1 ? 10 + (colorIndex - 1) * 6 : 12;
  const y = point.y > 186 ? point.y - offset - 8 : point.y + offset;
  return Math.max(20, Math.min(222, y));
}

function renderQuickWinInsight(currentRow, selectedMetrics) {
  const activeMetrics = state.metric === "TOTAL_SCORE" || state.metric === "ALL" ? metrics : selectedMetrics;
  if (state.office === "ALL") return renderRegionalQuickWin(activeMetrics);
  return renderLocalQuickWin(currentRow, activeMetrics);
}

function renderRegionalQuickWin(activeMetrics) {
  const movementInsight = renderScoreMovementInsight(activeMetrics);
  const rows = state.igiRows
    .filter((row) => row.tgl_proses === state.date && row.kode_kantor !== "905")
    .map((row) => {
      const opportunities = activeMetrics
        .map((metric) => buildOpportunity(row, metric))
        .filter((item) => item.burden > 0 && item.scoreGap > 0)
        .sort((a, b) => b.quickImpact - a.quickImpact || a.burden - b.burden);
      const totalGap = opportunities.reduce((sum, item) => sum + item.scoreGap, 0);
      const totalBurden = opportunities.reduce((sum, item) => sum + item.burden, 0);
      const best = opportunities[0];
      return { row, opportunities, totalGap, totalBurden, best };
    })
    .filter((item) => item.best)
    .sort((a, b) => b.totalGap - a.totalGap || a.totalBurden - b.totalBurden)
    .slice(0, 5);

  if (!rows.length) {
    return `
      <div class="quickwin-panel">
        <h3>Insight Quick Win</h3>
        <p>Tidak ada beban aktif yang bisa diprioritaskan pada filter saat ini.</p>
      </div>
    `;
  }

  return `
    <div class="quickwin-panel">
      <div class="quickwin-head">
        <h3>Insight Quick Win</h3>
        <span>Wilayah 905</span>
      </div>
      ${movementInsight}
      <div class="quickwin-priority">
        <b>Kerjakan dulu:</b>
        <span>${escapeHtml(rows[0].row.kode_kantor)} - ${escapeHtml(rows[0].row.nama_kantor)} pada ${escapeHtml(rows[0].best.metric.label)}. Tutup ${fmtNumber.format(rows[0].best.burden)} sisa beban agar nilai parameter bisa naik dari ${fmtDecimal.format(rows[0].best.score)} menjadi ${fmtNumber.format(rows[0].best.maxScore)}.</span>
      </div>
      <p>Urutan di bawah adalah target paling cepat menaikkan nilai wilayah: dahulukan kantor dan parameter yang masih punya sisa beban jelas serta poin maksimal yang bisa dikejar.</p>
      <ol class="quickwin-list">
        ${rows.map((item) => `
          <li>
            <b>${escapeHtml(item.row.kode_kantor)} - ${escapeHtml(item.row.nama_kantor)}</b>
            <span>Gas ${escapeHtml(item.best.metric.label)} dulu: beban ${fmtNumber.format(item.best.burden)}, nilai sekarang ${fmtDecimal.format(item.best.score)} dari ${fmtNumber.format(item.best.maxScore)}. Jika tuntas, nilai parameter ini bisa naik sampai ${fmtNumber.format(item.best.maxScore)}.</span>
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}

function renderLocalQuickWin(currentRow, activeMetrics) {
  const movementInsight = renderScoreMovementInsight(activeMetrics, currentRow);
  const previousRow = getPreviousIgiRow(currentRow);
  const opportunities = activeMetrics
    .map((metric) => buildOpportunity(currentRow, metric, previousRow))
    .sort((a, b) => b.scoreGap - a.scoreGap || a.burden - b.burden);
  const activeOpportunities = opportunities.filter((item) => item.burden > 0 && item.scoreGap > 0);
  const topItems = (activeOpportunities.length ? activeOpportunities : opportunities).slice(0, 3);

  return `
    <div class="quickwin-panel">
      <div class="quickwin-head">
        <h3>Insight Quick Win</h3>
        <span>${escapeHtml(currentRow.kode_kantor)} - ${escapeHtml(currentRow.nama_kantor)}</span>
      </div>
      ${movementInsight}
      <div class="quickwin-priority">
        <b>Kerjakan dulu:</b>
        <span>${escapeHtml(topItems[0].metric.label)}. ${escapeHtml(topItems[0].burdenText)} agar nilai parameter bisa naik dari ${fmtDecimal.format(topItems[0].score)} menjadi ${fmtNumber.format(topItems[0].maxScore)}.</span>
      </div>
      <p>Untuk cabang terpilih, mulai dari parameter paling berdampak lalu lanjutkan urutan berikutnya sampai beban utama tertutup.</p>
      <ol class="quickwin-list">
        ${topItems.map((item) => `
          <li>
            <b>${escapeHtml(item.metric.label)}</b>
            <span>${escapeHtml(item.burdenText)}. Nilai sekarang ${fmtDecimal.format(item.score)} dari ${fmtNumber.format(item.maxScore)}. Jika tuntas, nilai parameter ini bisa naik sampai ${fmtNumber.format(item.maxScore)}.</span>
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}

function renderScoreMovementInsight(activeMetrics, currentRow = null) {
  const contextRow = currentRow ?? state.igiRows.find((row) => row.tgl_proses === state.date && row.kode_kantor === "905");
  const previousRow = contextRow ? getPreviousIgiRow(contextRow) : null;
  if (!contextRow || !previousRow) {
    return `
      <div class="score-decline-insight neutral">
        <h4>Analisis Pergerakan Score</h4>
        <p>Belum ada update pembanding untuk membaca penyebab perubahan score.</p>
      </div>
    `;
  }
  const items = buildScoreMovementItems(contextRow, previousRow, activeMetrics);
  const totalScoreDelta = parseNumber(contextRow.nilai) - parseNumber(previousRow.nilai);
  const totalBurdenDelta = sumMetrics(contextRow, activeMetrics, "burden") - sumMetrics(previousRow, activeMetrics, "burden");
  const totalScore = parseNumber(contextRow.nilai);
  const maxScore = getTotalMaxScore(contextRow.kode_kantor);
  const scope = `${contextRow.kode_kantor} - ${contextRow.nama_kantor}`;
  const tone = totalScoreDelta > 0.005 ? "good" : totalScoreDelta < -0.005 ? "bad" : "neutral";
  const driver = pickScoreMovementDriver(items, totalScoreDelta);
  const mainDriver = driver ? buildMainMovementDriverText(driver, currentRow) : "belum ada parameter dominan yang terbaca.";
  const movementText = totalScoreDelta < -0.005
    ? "terjadi penurunan score"
    : totalScoreDelta > 0.005
      ? "terjadi kenaikan score"
      : "score relatif tetap";
  const burdenText = totalBurdenDelta < 0
    ? `terjadi penurunan beban total sebanyak <strong>${fmtNumber.format(Math.abs(totalBurdenDelta))}</strong>`
    : totalBurdenDelta > 0
      ? `terjadi kenaikan beban total sebanyak <strong>${fmtNumber.format(totalBurdenDelta)}</strong>`
      : "beban total tidak berubah";
  const otherItems = items.filter((item) => item !== driver);
  return `
    <div class="score-decline-insight ${tone}">
      <h4>Analisis Pergerakan Score</h4>
      <p>
        Progres dari tanggal <strong>${escapeHtml(formatFullDate(previousRow.tgl_proses))}</strong>
        s.d. <strong>${escapeHtml(formatFullDate(contextRow.tgl_proses))}</strong>
        (<strong>${fmtNumber.format(countBusinessDays(previousRow.tgl_proses, contextRow.tgl_proses))} hari kerja</strong>),
        ${burdenText}, sehingga ${movementText} menjadi
        <strong>${fmtDecimal.format(totalScore)} dari total ${fmtNumber.format(maxScore)} poin</strong>
        (${formatSignedDecimal(totalScoreDelta)} poin).
      </p>
      <p>
        ${mainDriver}
      </p>
      <p>
        ${renderOtherParameterMovementText(otherItems)}
      </p>
      <ol class="score-decline-list">
        ${items.map((item) => `
          <li>
            <b>${escapeHtml(item.metric.label)}</b>
            <span>nilai ${fmtDecimal.format(item.previousScore)} → ${fmtDecimal.format(item.score)}
            (<strong>${formatSignedDecimal(item.scoreDelta)} poin</strong>), beban ${fmtNumber.format(item.previousBurden)} → ${fmtNumber.format(item.burden)}
            (<strong>${formatSignedInteger(item.burdenDelta)}</strong>).</span>
            ${renderMetricBranchDrivers(item.metric, currentRow)}
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}

function buildMainMovementDriverText(driver, currentRow = null) {
  const branchDriver = currentRow && currentRow.kode_kantor !== "905"
    ? null
    : pickMetricBranchDriver(driver.metric, driver.burdenDelta);
  const movement = driver.burdenDelta < 0 ? "penurunan" : driver.burdenDelta > 0 ? "kenaikan" : "perubahan";
  const branchClass = branchDriver?.delta < 0 ? "burden-down" : branchDriver?.delta > 0 ? "burden-up" : "neutral";
  const branchText = branchDriver
    ? ` di cabang <strong class="${branchClass}">${escapeHtml(branchDriver.code)} - ${escapeHtml(branchDriver.name)}</strong> dengan ${branchDriver.delta < 0 ? "penurunan" : "kenaikan"} beban sebanyak <strong class="${branchClass}">${formatSignedInteger(branchDriver.delta)}</strong>`
    : "";
  return `
    ${driver.scoreDelta < -0.005 ? "Penurunan" : driver.scoreDelta > 0.005 ? "Kenaikan" : "Pergerakan"} terbanyak ada pada parameter
    <strong>${escapeHtml(driver.metric.label)}</strong>${branchText}. Secara konsol, parameter ini mengalami
    ${movement} beban <strong>${formatSignedInteger(driver.burdenDelta)}</strong> dan perubahan poin
    <strong>${formatSignedDecimal(driver.scoreDelta)}</strong>, sehingga score parameter menjadi
    <strong>${fmtDecimal.format(driver.score)}</strong>.
  `;
}

function renderOtherParameterMovementText(items) {
  if (!items.length) return "Tidak ada parameter lain pada filter ini.";
  const parts = items.map((item) => {
    const direction = item.scoreDelta < -0.005
      ? "turun"
      : item.scoreDelta > 0.005
        ? "naik"
        : "tetap";
    return `<strong>${escapeHtml(item.metric.label)}</strong> ${direction} ${formatSignedDecimal(item.scoreDelta)} poin dengan beban ${formatSignedInteger(item.burdenDelta)}`;
  });
  return `Untuk parameter lain, ${parts.join("; ")}.`;
}

function pickMetricBranchDriver(metric, directionValue) {
  const drivers = buildMetricBranchDrivers(metric);
  if (!drivers.length) return null;
  if (directionValue < 0) return [...drivers].reverse().find((item) => item.delta < 0) ?? null;
  if (directionValue > 0) return drivers.find((item) => item.delta > 0) ?? null;
  return drivers[0] ?? null;
}

function renderMetricBranchDrivers(metric, currentRow = null) {
  if (currentRow && currentRow.kode_kantor !== "905") return "";
  const drivers = buildMetricBranchDrivers(metric);
  const increase = drivers.find((item) => item.delta > 0);
  const decrease = [...drivers].reverse().find((item) => item.delta < 0);
  if (!increase && !decrease) {
    return `<small class="branch-driver neutral">Tidak ada perubahan beban cabang yang signifikan.</small>`;
  }
  return `
    <small class="branch-driver">
      ${increase ? `Beban naik terbesar: <strong class="burden-up">${escapeHtml(increase.code)} - ${escapeHtml(increase.name)}</strong> <strong class="burden-up">${formatSignedInteger(increase.delta)}</strong>.` : "Tidak ada cabang yang bebannya naik."}
      ${decrease ? ` Beban turun terbesar: <strong class="burden-down">${escapeHtml(decrease.code)} - ${escapeHtml(decrease.name)}</strong> <strong class="burden-down">${formatSignedInteger(decrease.delta)}</strong>.` : " Tidak ada cabang yang bebannya turun."}
    </small>
  `;
}

function buildMetricBranchDrivers(metric) {
  return state.igiRows
    .filter((row) => row.tgl_proses === state.date && row.kode_kantor !== "905")
    .filter(matchesOfficeMode)
    .filter((row) => !state.search || `${row.kode_kantor} ${row.nama_kantor}`.toLowerCase().includes(state.search))
    .map((row) => {
      const previousRow = getPreviousIgiRow(row);
      return {
        code: row.kode_kantor,
        name: row.nama_kantor,
        delta: previousRow ? parseNumber(row[metric.burden]) - parseNumber(previousRow[metric.burden]) : 0,
      };
    })
    .filter((item) => item.delta !== 0)
    .sort((a, b) => b.delta - a.delta);
}

function buildScoreMovementItems(row, previousRow, activeMetrics) {
  return activeMetrics.map((metric) => {
    const score = parseNumber(row[metric.score]);
    const previousScore = parseNumber(previousRow[metric.score]);
    const burden = parseNumber(row[metric.burden]);
    const previousBurden = parseNumber(previousRow[metric.burden]);
    return {
      metric,
      score,
      previousScore,
      scoreDelta: score - previousScore,
      burden,
      previousBurden,
      burdenDelta: burden - previousBurden,
    };
  }).sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta) || Math.abs(b.burdenDelta) - Math.abs(a.burdenDelta));
}

function pickScoreMovementDriver(items, totalScoreDelta) {
  if (!items.length) return null;
  if (totalScoreDelta < -0.005) {
    return [...items].sort((a, b) => a.scoreDelta - b.scoreDelta || b.burdenDelta - a.burdenDelta)[0];
  }
  if (totalScoreDelta > 0.005) {
    return [...items].sort((a, b) => b.scoreDelta - a.scoreDelta || a.burdenDelta - b.burdenDelta)[0];
  }
  return items[0];
}

function formatSignedInteger(value) {
  const number = Number(value) || 0;
  if (number === 0) return "0";
  return `${number > 0 ? "+" : "-"}${fmtNumber.format(Math.abs(number))}`;
}

function formatSignedDecimal(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) < 0.005) return "0";
  return `${number > 0 ? "+" : ""}${fmtDecimal.format(number)}`;
}

function buildOpportunity(row, metric, previousRow = null) {
  const burden = parseNumber(row[metric.burden]);
  const score = parseNumber(row[metric.score]);
  const maxScore = getMaxScore(metric.key, row.kode_kantor);
  const normalizedScore = Math.max(0, Math.min(maxScore, score));
  const scoreGap = Math.max(0, maxScore - normalizedScore);
  const previousBurden = previousRow ? parseNumber(previousRow[metric.burden]) : null;
  const burdenDelta = previousBurden === null ? null : burden - previousBurden;
  const burdenText = burdenDelta === null
    ? `Sisa beban ${fmtNumber.format(burden)}`
    : burdenDelta < 0
      ? `Sisa beban ${fmtNumber.format(burden)}, turun ${fmtNumber.format(Math.abs(burdenDelta))}`
      : burdenDelta > 0
        ? `Sisa beban ${fmtNumber.format(burden)}, naik ${fmtNumber.format(burdenDelta)}`
        : `Sisa beban ${fmtNumber.format(burden)}, tetap`;
  return {
    metric,
    burden,
    score,
    maxScore,
    scoreGap,
    quickImpact: scoreGap / Math.max(1, burden),
    burdenText,
  };
}

function renderTable(rows, selectedMetrics) {
  const officeRows = filterProgressTableRows(rows);
  const selectedMetricKeys = new Set(selectedMetrics.map((metric) => metric.key));
  const visibleMetrics = metrics.filter((metric) => state.tableMetrics.includes(metric.key) && selectedMetricKeys.has(metric.key));
  const showTotalColumn = state.tableMetrics.includes("nilai_total");

  const columns = [
    { key: "kode_kantor", label: "Kode Kantor", sortType: "text", sortValue: (row) => row.kode_kantor, value: (row) => row.kode_kantor },
    { key: "nama_kantor", label: "Nama Kantor", sortType: "text", sortValue: (row) => row.nama_kantor, value: (row) => row.nama_kantor },
    ...visibleMetrics.map((metric) => (
      { key: `burden_${metric.key}`, label: metric.label, className: "metric-cell-wrap", html: true, sortType: "number", sortValue: (row) => parseNumber(row[metric.burden]), value: (row) => renderTableMetricTags(row, metric) }
    )),
    ...(showTotalColumn ? [
      { key: "nilai_total", label: "Nilai Total", className: "metric-cell-wrap", html: true, sortType: "number", sortValue: (row) => parseNumber(row.nilai), value: (row) => renderTotalScoreChangeTag(row) },
    ] : []),
  ];
  const sortOptions = buildProgressSortOptions(columns, visibleMetrics, showTotalColumn);
  if (!sortOptions.some((column) => column.key === state.tableSort.key)) {
    state.tableSort = sortOptions.some((column) => column.key === "nilai_total")
      ? { key: "nilai_total", direction: "desc" }
      : { key: "kode_kantor", direction: "asc" };
  }
  const sortedRows = sortProgressTableRows(officeRows, sortOptions);

  els.tableHead.innerHTML = `<tr>${columns.map((column) => {
    const isActive = column.key === state.tableSort.key;
    const icon = isActive ? (state.tableSort.direction === "asc" ? "▲" : "▼") : "↕";
    return `<th class="${column.className ?? ""}"><button class="sort-button ${isActive ? "active" : ""}" type="button" data-sort-key="${escapeHtml(column.key)}">${escapeHtml(column.label)} <span>${icon}</span></button></th>`;
  }).join("")}</tr>`;
  els.tableHead.innerHTML += `
    <tr class="component-sort-row">
      <th></th>
      <th></th>
      ${visibleMetrics.map((metric) => `
        <th class="metric-cell-wrap">
          <div class="component-sort">
            ${state.tableComponents.includes("burden") ? renderComponentSortButton(`burden_${metric.key}`, "Sisa") : ""}
            ${state.tableComponents.includes("progress") ? renderComponentSortButton(`progress_${metric.key}`, "+/-") : ""}
            ${state.tableComponents.includes("percent") ? renderComponentSortButton(`percent_${metric.key}`, "%") : ""}
            ${state.tableComponents.includes("score") ? renderComponentSortButton(`score_${metric.key}`, "Score") : ""}
          </div>
        </th>
      `).join("")}
      ${showTotalColumn ? `<th class="metric-cell-wrap">
        <div class="component-sort">
          ${state.tableComponents.includes("score") ? renderComponentSortButton("nilai_total", "Score") : ""}
          ${state.tableComponents.includes("progress") ? renderComponentSortButton("nilai_delta", "+/-") : ""}
        </div>
      </th>` : ""}
    </tr>
  `;
  els.tableBody.innerHTML = sortedRows.map((row) => `
    <tr>${columns.map((column) => {
      const value = column.value(row);
      return `<td class="${column.className ?? ""}" ${column.html ? "" : `title="${escapeHtml(value)}"`}>${column.html ? value : escapeHtml(value)}</td>`;
    }).join("")}</tr>
  `).join("");
  els.tableSubtitle.textContent = `${fmtNumber.format(officeRows.length)} kantor cocok pada update ${state.date}. Klik nama kolom untuk sort.`;
}

function filterProgressTableRows(rows) {
  return rows
    .filter((row) => state.officeMode === "ALL" || matchesOfficeMode(row))
    .filter((row) => state.office === "ALL" || row.kode_kantor === state.office)
    .filter((row) => !state.search || `${row.kode_kantor} ${row.nama_kantor}`.toLowerCase().includes(state.search));
}

function buildProgressSortOptions(columns, selectedMetrics, showTotalColumn = true) {
  return [
    ...columns,
    ...selectedMetrics.flatMap((metric) => [
      ...(state.tableComponents.includes("burden") ? [{ key: `burden_${metric.key}`, sortType: "number", sortValue: (row) => parseNumber(row[metric.burden]) }] : []),
      ...(state.tableComponents.includes("progress") ? [{ key: `progress_${metric.key}`, sortType: "number", sortValue: (row) => getTableMetricProgress(row, metric) ?? 0 }] : []),
      ...(state.tableComponents.includes("percent") ? [{ key: `percent_${metric.key}`, sortType: "number", sortValue: (row) => parseNumber(row[metric.percent]) }] : []),
      ...(state.tableComponents.includes("score") ? [{ key: `score_${metric.key}`, sortType: "number", sortValue: (row) => parseNumber(row[metric.score]) }] : []),
    ]),
    ...(showTotalColumn && state.tableComponents.includes("progress") ? [{ key: "nilai_delta", sortType: "number", sortValue: (row) => getTotalScoreDelta(row) ?? 0 }] : []),
  ];
}

function sortProgressTableRows(rows, sortOptions) {
  const sortColumn = sortOptions.find((column) => column.key === state.tableSort.key) ?? sortOptions[0];
  const direction = state.tableSort.direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const first = sortColumn.sortValue(a);
    const second = sortColumn.sortValue(b);
    if (sortColumn.sortType === "number") return (first - second) * direction;
    return String(first ?? "").localeCompare(String(second ?? ""), "id", { numeric: true, sensitivity: "base" }) * direction;
  });
}

function renderComponentSortButton(key, label) {
  const isActive = state.tableSort.key === key;
  return `<button class="component-sort-button ${isActive ? "active" : ""}" type="button" data-sort-key="${escapeHtml(key)}">${escapeHtml(label)} <span>${getSortIcon(key)}</span></button>`;
}

function getSortIcon(key) {
  if (state.tableSort.key !== key) return "↕";
  return state.tableSort.direction === "asc" ? "▲" : "▼";
}

function renderTableMetricTags(row, metric) {
  const percent = parseNumber(row[metric.percent]);
  const burden = parseNumber(row[metric.burden]);
  const progress = getTableMetricProgress(row, metric);
  const progressClass = progress === null || progress === 0 ? "neutral" : progress < 0 ? "good" : "bad";
  const progressText = progress === null
    ? "-"
    : `${progress > 0 ? "+" : ""}${fmtNumber.format(progress)}`;
  const tags = [
    state.tableComponents.includes("burden") ? `<span class="tag plain">${fmtNumber.format(burden)}</span>` : "",
    state.tableComponents.includes("progress") ? `<span class="tag ${progressClass}">${progressText}</span>` : "",
    state.tableComponents.includes("percent") ? `<span class="tag percent" style="${getPercentTagStyle(percent)}">${fmtDecimal.format(percent)}%</span>` : "",
    state.tableComponents.includes("score") ? `<span class="tag score" style="${getScoreCellStyle(parseNumber(row[metric.score]), getMaxScore(metric.key, row.kode_kantor)).replaceAll("score", "tag-score")}">${escapeHtml(formatRawScore(row[metric.score]))}</span>` : "",
  ].filter(Boolean);

  return `
    <div class="metric-tags ${tags.length === 1 ? "single" : ""}">
      ${tags.length ? tags.join("") : `<span class="tag neutral">-</span>`}
    </div>
  `;
}

function getTableMetricProgress(row, metric) {
  const previousRow = getPreviousIgiRow(row);
  if (!previousRow) return null;
  return parseNumber(row[metric.burden]) - parseNumber(previousRow[metric.burden]);
}

function renderTotalScoreChangeTag(row) {
  const delta = getTotalScoreDelta(row);
  const scoreTag = state.tableComponents.includes("score")
    ? `<span class="tag plain">${formatNumber(row.nilai)}</span>`
    : "";
  if (delta === null) {
    const tags = [
      scoreTag,
      state.tableComponents.includes("progress") ? `<span class="tag neutral">-</span>` : "",
    ].filter(Boolean);
    return `<div class="metric-tags score-total ${tags.length === 1 ? "single" : ""}">${tags.length ? tags.join("") : `<span class="tag neutral">-</span>`}</div>`;
  }
  const deltaClass = delta === 0 ? "neutral" : delta > 0 ? "good" : "bad";
  const tags = [
    scoreTag,
    state.tableComponents.includes("progress") ? `<span class="tag ${deltaClass}">${delta > 0 ? "+" : ""}${fmtDecimal.format(delta)}</span>` : "",
  ].filter(Boolean);
  return `<div class="metric-tags score-total ${tags.length === 1 ? "single" : ""}">${tags.length ? tags.join("") : `<span class="tag neutral">-</span>`}</div>`;
}

function getTotalScoreDelta(row) {
  const previousRow = getPreviousIgiRow(row);
  if (!previousRow) return null;
  return parseNumber(row.nilai) - parseNumber(previousRow.nilai);
}

function formatRawScore(value) {
  const text = String(value ?? "").trim();
  return text || "0";
}

function getPercentTagStyle(percent) {
  if (percent < 0) {
    return "--percent-bg:#111827; --percent-color:#ffffff;";
  }
  if (percent < 50) {
    return "--percent-bg:#fff1f1; --percent-color:#b42318;";
  }
  if (percent < 80) {
    return "--percent-bg:#fffbeb; --percent-color:#b45309;";
  }
  return "--percent-bg:#ecfdf3; --percent-color:#0f766e;";
}

function renderParameterResume(rows, selectedMetrics) {
  const officeRows = rows.filter((row) => row.kode_kantor !== "905");
  const activeMetrics = state.metric === "TOTAL_SCORE" || state.metric === "ALL" ? metrics : selectedMetrics;

  if (state.office !== "ALL") {
    const targetRow = rows.find((row) => row.kode_kantor === state.office);
    els.parameterResumeSubtitle.textContent = `Update ${state.date}; analisis lokal untuk kantor terpilih.`;
    els.parameterResume.innerHTML = targetRow
      ? renderLocalParameterResume(targetRow, activeMetrics)
      : `<p class="empty">Tidak ada data kantor untuk filter aktif.</p>`;
    return;
  }

  const groups = [
    { key: "main", label: "Cabang Induk", rows: officeRows.filter((row) => getOfficeClass(row.kode_kantor).key === "main") },
    { key: "kcp", label: "KCP", rows: officeRows.filter((row) => getOfficeClass(row.kode_kantor).key === "kcp") },
  ];

  els.parameterResumeSubtitle.textContent = `Update ${state.date}; resume mengikuti indikator terfilter.`;
  els.parameterResume.innerHTML = `
    ${groups.map((group) => `
      <section class="resume-group simple">
        <h3>${escapeHtml(group.label)}</h3>
        ${renderSimpleGroupResume(group.rows, activeMetrics)}
      </section>
    `).join("")}
    <p class="resume-spirit simple">Semangat untuk kantor yang masih punya beban: fokus pada parameter prioritas dulu, karena kontribusi kecil yang konsisten akan cepat terasa pada nilai wilayah.</p>
  `;
}

function renderLocalParameterResume(row, activeMetrics) {
  const ranked = rankParameterPriorities(row, activeMetrics);
  const prediction = buildExecutionPrediction(row, activeMetrics, ranked);
  if (!ranked.length) {
    return `
      <section class="resume-group simple">
        <h3>${escapeHtml(row.kode_kantor)} - ${escapeHtml(row.nama_kantor)}</h3>
        <p class="resume-paragraph">Semua parameter pada filter ini sudah tidak memiliki kandidat beban prioritas atau nilainya sudah maksimal.</p>
      </section>
    `;
  }

  const top = ranked[0];
  return `
    <section class="resume-group simple">
      <h3>${escapeHtml(row.kode_kantor)} - ${escapeHtml(row.nama_kantor)}</h3>
      <div class="resume-paragraph">
        <p>
          <strong>${escapeHtml(top.metric.label)}</strong> perlu digas dulu karena masih ada
          <strong>${fmtNumber.format(top.burden)} sisa beban</strong>, nilai saat ini
          <strong>${fmtDecimal.format(top.score)} dari ${fmtNumber.format(top.maxScore)}</strong>,
          dan bobot parameter ini <strong>${fmtNumber.format(top.maxScore)} poin</strong>.
          Jika beban utama tuntas, nilai parameter berpotensi naik sampai
          <strong>${fmtNumber.format(top.maxScore)}</strong>.
        </p>
        ${ranked.slice(1, 4).map((item, index) => `
          <p>
            Prioritas ${index + 2}: <strong>${escapeHtml(item.metric.label)}</strong>,
            sisa beban <strong>${fmtNumber.format(item.burden)}</strong>,
            nilai <strong>${fmtDecimal.format(item.score)} dari ${fmtNumber.format(item.maxScore)}</strong>.
          </p>
        `).join("")}
        <p class="resume-prediction">
          <strong>Kesimpulan:</strong>
          ${renderPredictionText(prediction)}
        </p>
      </div>
    </section>
    <p class="resume-spirit simple">Semangat untuk kantor yang masih punya beban: fokus pada parameter prioritas dulu, karena kontribusi kecil yang konsisten akan cepat terasa pada nilai wilayah.</p>
  `;
}

function rankParameterPriorities(row, activeMetrics) {
  const totalBurden = Math.max(1, sumMetrics(row, activeMetrics, "burden"));
  const totalMaxScore = Math.max(1, activeMetrics.reduce((sum, metric) => sum + getMaxScore(metric.key, row.kode_kantor), 0));
  return activeMetrics
    .map((metric) => {
      const burden = parseNumber(row[metric.burden]);
      const score = parseNumber(row[metric.score]);
      const maxScore = getMaxScore(metric.key, row.kode_kantor);
      const scoreGap = Math.max(0, maxScore - Math.max(0, Math.min(maxScore, score)));
      const burdenShare = burden / totalBurden;
      const scoreGapRatio = maxScore ? scoreGap / maxScore : 0;
      const weightShare = maxScore / totalMaxScore;
      const priority = (scoreGapRatio * 0.45) + (weightShare * 0.35) + (burdenShare * 0.20);
      return { metric, burden, score, maxScore, scoreGap, priority };
    })
    .filter((item) => item.burden > 0 && item.scoreGap > 0)
    .sort((a, b) => b.priority - a.priority || b.scoreGap - a.scoreGap || b.maxScore - a.maxScore || b.burden - a.burden);
}

function buildExecutionPrediction(row, activeMetrics, ranked = rankParameterPriorities(row, activeMetrics)) {
  const horizonDays = 7;
  const currentScore = parseNumber(row.nilai);
  const totalMaxScore = getTotalMaxScore(row.kode_kantor);
  const potentialGain = ranked.reduce((sum, item) => sum + item.scoreGap, 0);
  const totalBurden = ranked.reduce((sum, item) => sum + item.burden, 0);
  const dailyRate = getRecentDailyBurdenReduction(row.kode_kantor, activeMetrics, row.tgl_proses);
  const projectedResolvedBurden = dailyRate > 0 ? Math.min(totalBurden, dailyRate * horizonDays) : totalBurden;
  const completionRatio = totalBurden ? Math.min(1, projectedResolvedBurden / totalBurden) : 0;
  const projectedGain = potentialGain * completionRatio;
  const predictedScore = Math.min(totalMaxScore, currentScore + projectedGain);
  return {
    currentScore,
    predictedScore,
    potentialGain,
    projectedGain,
    totalBurden,
    projectedResolvedBurden,
    dailyRate,
    horizonDays,
  };
}

function renderPredictionText(prediction) {
  if (!prediction.totalBurden || prediction.potentialGain <= 0) {
    return `Jika beban prioritas sudah tuntas, score diprediksi bertahan di <strong>${fmtDecimal.format(prediction.currentScore)} poin</strong> karena tidak ada gap nilai yang bisa dikejar pada filter ini.`;
  }
  const daysText = `dalam <strong>${fmtNumber.format(prediction.horizonDays)} hari</strong>`;
  const rateText = prediction.dailyRate
    ? ` Proyeksi memakai rata-rata penurunan beban terakhir sekitar ${fmtDecimal.format(prediction.dailyRate)} beban per hari.`
    : ` Karena histori penurunan belum cukup, proyeksi 1 minggu memakai skenario seluruh prioritas dikerjakan disiplin.`;
  return `Jika prioritas ini dieksekusi disiplin selama 1 minggu (${daysText}), score diproyeksikan naik dari <strong>${fmtDecimal.format(prediction.currentScore)}</strong> menjadi <strong>${fmtDecimal.format(prediction.predictedScore)} poin</strong> atau bertambah sekitar <strong>+${fmtDecimal.format(prediction.projectedGain)} poin</strong>.${rateText}`;
}

function getRecentDailyBurdenReduction(officeCode, activeMetrics, currentDate) {
  const currentTime = parseDate(currentDate);
  const rows = state.igiRows
    .filter((row) => row.kode_kantor === officeCode)
    .filter((row) => parseDate(row.tgl_proses) <= currentTime)
    .sort((a, b) => parseDate(a.tgl_proses) - parseDate(b.tgl_proses));
  const dailyRates = [];
  for (let index = Math.max(1, rows.length - 4); index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    const dayDiff = Math.max(1, Math.round((parseDate(current.tgl_proses) - parseDate(previous.tgl_proses)) / 86400000));
    const reduction = sumMetrics(previous, activeMetrics, "burden") - sumMetrics(current, activeMetrics, "burden");
    if (reduction > 0) dailyRates.push(reduction / dayDiff);
  }
  if (!dailyRates.length) return null;
  return dailyRates.reduce((sum, value) => sum + value, 0) / dailyRates.length;
}

function renderSimpleGroupResume(rows, activeMetrics) {
  if (!rows.length) {
    return `<p class="resume-paragraph">Tidak ada data kantor untuk kategori ini.</p>`;
  }

  const sentences = activeMetrics.map((metric) => {
    const ranked = rows.map((row) => {
    const burden = parseNumber(row[metric.burden]);
    const percent = parseNumber(row[metric.percent]);
    const score = parseNumber(row[metric.score]);
    const maxScore = getMaxScore(metric.key, row.kode_kantor);
    return {
      row,
      burden,
      percent,
      score,
      maxScore,
      scoreGap: Math.max(0, maxScore - Math.max(0, Math.min(maxScore, score))),
    };
    });

    const target = ranked
      .filter((item) => item.burden > 0 && item.scoreGap > 0)
      .sort((a, b) => b.scoreGap - a.scoreGap || b.maxScore - a.maxScore || b.burden - a.burden)[0];
    if (!target) return "";
    return `
      <strong>${escapeHtml(metric.label)}</strong> sebaiknya digas dulu di
      <strong>${escapeHtml(target.row.kode_kantor)} - ${escapeHtml(target.row.nama_kantor)}</strong>
      karena masih ada <strong>${fmtNumber.format(target.burden)} sisa beban</strong>
      dan nilai baru <strong>${fmtDecimal.format(target.score)} dari ${fmtNumber.format(target.maxScore)}</strong>.
    `;
  }).filter(Boolean);

  return `
    <div class="resume-paragraph">${sentences.length
      ? sentences.map((sentence) => `<p>${sentence}</p>`).join("")
      : `<p>Tidak ada sisa beban prioritas pada kategori ini.</p>`}
    </div>
  `;
}

function renderEmpty() {
  if (els.latestDate) els.latestDate.textContent = "-";
  if (els.totalBurden) els.totalBurden.textContent = "-";
  if (els.realization) els.realization.textContent = "-";
  if (els.score) els.score.textContent = "-";
  els.igiCards.innerHTML = `<p class="empty">Belum ada data IGI.</p>`;
  els.trendCards.innerHTML = `<p class="empty">Belum ada data trend.</p>`;
  els.parameterResume.innerHTML = `<p class="empty">Belum ada resume.</p>`;
  els.tableHead.innerHTML = "";
  els.tableBody.innerHTML = "";
}

function setDateInputLimits(input, dates, selectedValue) {
  if (!input) return;
  const isoDates = dates.map(dateToInputValue).filter(Boolean);
  input.min = isoDates[0] ?? "";
  input.max = isoDates.at(-1) ?? "";
  input.value = dateToInputValue(selectedValue);
}

function setOptions(select, options, selectedValue) {
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

function uniqueValues(rows, column) {
  return [...new Set(rows.map((row) => String(row[column] ?? "").trim()).filter(Boolean))];
}

function compareDateDesc(a, b) {
  return parseDate(b) - parseDate(a);
}

function parseDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
  const parsed = new Date(text).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function inputValueToSheetDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function dateToInputValue(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function simpleDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}`;
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

function trendDateLabel(value, currentTrendMonth) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return text;
  const monthIndex = Number(match[2]) - 1;
  const currentKey = `${match[3]}-${match[2].padStart(2, "0")}`;
  if (currentKey !== currentTrendMonth) return monthShortNames[monthIndex] ?? text;
  return `${match[1].padStart(2, "0")}-${monthLongNames[monthIndex] ?? match[2]}`;
}

function compactValueLabel(value) {
  const number = parseNumber(value);
  return fmtDecimal.format(number);
}

function compactTrendRows(rows) {
  if (rows.length <= 1) return rows;
  const latestMonth = monthKey(rows.at(-1).tgl_proses);
  const monthlyLastRows = new Map();

  rows.forEach((row) => {
    const key = monthKey(row.tgl_proses);
    if (key !== latestMonth) monthlyLastRows.set(key, row);
  });

  return [
    ...monthlyLastRows.values(),
    ...rows.filter((row) => monthKey(row.tgl_proses) === latestMonth),
  ].sort((a, b) => parseDate(a.tgl_proses) - parseDate(b.tgl_proses));
}

function monthKey(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return text;
  return `${match[3]}-${match[2].padStart(2, "0")}`;
}

function buildLineChart(values, maxValue) {
  const width = 636;
  const height = 180;
  const left = 52;
  const top = 26;
  const denominator = Math.max(1, values.length - 1);
  const safeMax = Math.max(1, maxValue);
  const points = values.map((value, index) => {
    const clamped = Math.max(0, Math.min(safeMax, value));
    return {
      x: left + (index / denominator) * width,
      y: top + height - (clamped / safeMax) * height,
    };
  });
  return {
    points,
    polyline: points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
  };
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

function formatNumber(value) {
  return fmtDecimal.format(parseNumber(value));
}

function sumMetrics(row, selectedMetrics, key) {
  return selectedMetrics.reduce((sum, metric) => sum + parseNumber(row?.[metric[key]]), 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setLoading(isLoading) {
  if (isLoading) {
    els.meta.textContent = "Memuat data spreadsheet...";
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 3600);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function currentSelectedMetrics() {
  return state.metric === "ALL" || state.metric === "TOTAL_SCORE"
    ? metrics
    : metrics.filter((item) => item.key === state.metric);
}

function currentDateRows() {
  const date = state.date || uniqueValues(state.igiRows, "tgl_proses").sort(compareDateDesc)[0] || "";
  return state.igiRows.filter((row) => row.tgl_proses === date);
}

function downloadProgressTableCsv() {
  const selectedMetrics = currentSelectedMetrics();
  const selectedMetricKeys = new Set(selectedMetrics.map((metric) => metric.key));
  const visibleMetrics = metrics.filter((metric) => state.tableMetrics.includes(metric.key) && selectedMetricKeys.has(metric.key));
  const showTotalColumn = state.tableMetrics.includes("nilai_total");
  const rows = filterProgressTableRows(currentDateRows());
  if (!rows.length) {
    showToast("Tidak ada tabel progress untuk didownload.");
    return;
  }
  const columnsForSort = [
    { key: "kode_kantor", sortType: "text", sortValue: (row) => row.kode_kantor },
    { key: "nama_kantor", sortType: "text", sortValue: (row) => row.nama_kantor },
    ...visibleMetrics.map((metric) => ({ key: `burden_${metric.key}`, sortType: "number", sortValue: (row) => parseNumber(row[metric.burden]) })),
    ...(showTotalColumn ? [{ key: "nilai_total", sortType: "number", sortValue: (row) => parseNumber(row.nilai) }] : []),
  ];
  const sortOptions = buildProgressSortOptions(columnsForSort, visibleMetrics, showTotalColumn);
  const sortedRows = sortProgressTableRows(rows, sortOptions);
  const columns = [
    "Kode Kantor",
    "Nama Kantor",
    ...visibleMetrics.flatMap((metric) => [
      ...(state.tableComponents.includes("burden") ? [`Sisa ${metric.label}`] : []),
      ...(state.tableComponents.includes("progress") ? [`Progress ${metric.label}`] : []),
      ...(state.tableComponents.includes("percent") ? [`% ${metric.label}`] : []),
      ...(state.tableComponents.includes("score") ? [`Score ${metric.label}`] : []),
    ]),
    ...(showTotalColumn && state.tableComponents.includes("score") ? ["Nilai Total"] : []),
    ...(showTotalColumn && state.tableComponents.includes("progress") ? ["Progress Nilai Total"] : []),
  ];
  const csv = [
    columns.map(csvEscape).join(","),
    ...sortedRows.map((row) => [
      row.kode_kantor,
      row.nama_kantor,
      ...visibleMetrics.flatMap((metric) => [
        ...(state.tableComponents.includes("burden") ? [parseNumber(row[metric.burden])] : []),
        ...(state.tableComponents.includes("progress") ? [getTableMetricProgress(row, metric) ?? ""] : []),
        ...(state.tableComponents.includes("percent") ? [row[metric.percent]] : []),
        ...(state.tableComponents.includes("score") ? [formatRawScore(row[metric.score])] : []),
      ]),
      ...(showTotalColumn && state.tableComponents.includes("score") ? [formatRawScore(row.nilai)] : []),
      ...(showTotalColumn && state.tableComponents.includes("progress") ? [getTotalScoreDelta(row) ?? ""] : []),
    ].map(csvEscape).join(",")),
  ].join("\r\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const office = state.office === "ALL" ? state.officeMode.toLowerCase() : state.office.toLowerCase();
  link.href = url;
  link.download = `tabel-progress-${state.date || "update"}-${office}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Tabel progress berhasil didownload sebagai CSV.");
}

async function downloadProgressTableJpg() {
  const table = els.tableCapture?.querySelector("table");
  if (!table || !els.tableBody.children.length) {
    showToast("Tidak ada tabel progress untuk diexport.");
    return;
  }

  const bodyRows = [...table.querySelectorAll("tbody tr")];
  const firstBodyCells = [...(bodyRows[0]?.children ?? [])];
  const headers = [...(table.querySelector("thead tr:first-child")?.children ?? [])].slice(0, firstBodyCells.length);
  const columnWidths = headers.map((header) => Math.max(118, Math.ceil(header.getBoundingClientRect().width)));
  const headerHeight = 34;
  const rowHeight = 34;
  const padding = 18;
  const width = columnWidths.reduce((sum, value) => sum + value, 0) + padding * 2;
  const height = headerHeight + bodyRows.length * rowHeight + padding * 2 + 28;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#172033";
  context.font = "700 14px Arial";
  context.fillText(`Tabel Progress Kantor - Update ${state.date || "-"}`, padding, 18);

  let x = padding;
  let y = padding + 18;
  headers.forEach((header, index) => {
    drawCellBox(context, x, y, columnWidths[index], headerHeight, "#f8fafc", "#e3e9f2");
    drawWrappedText(context, header.innerText.replace(/[↕▲▼]/g, "").trim(), x + 8, y + 13, columnWidths[index] - 16, "#344054", "700 10px Arial");
    x += columnWidths[index];
  });

  bodyRows.forEach((row, rowIndex) => {
    x = padding;
    y = padding + 18 + headerHeight + rowIndex * rowHeight;
    const cells = [...row.children].slice(0, columnWidths.length);
    cells.forEach((cell, index) => {
      drawCellBox(context, x, y, columnWidths[index], rowHeight, rowIndex % 2 ? "#ffffff" : "#fbfdff", "#edf1f5");
      if (cell.querySelector(".metric-tags")) {
        drawMetricTags(context, cell, x + 7, y + 7, columnWidths[index] - 14);
      } else {
        drawWrappedText(context, cell.innerText.trim(), x + 8, y + 14, columnWidths[index] - 16, "#344054", "700 10.5px Arial");
      }
      x += columnWidths[index];
    });
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/jpeg", 0.92);
  link.download = `tabel-progress-${state.date || "update"}.jpg`;
  link.click();
  showToast("Tabel progress berhasil dibuat sebagai JPG.");
}

function drawCellBox(context, x, y, width, height, fill, stroke) {
  context.fillStyle = fill;
  context.fillRect(x, y, width, height);
  context.strokeStyle = stroke;
  context.lineWidth = 1;
  context.strokeRect(x, y, width, height);
}

function drawWrappedText(context, text, x, y, maxWidth, color, font) {
  context.fillStyle = color;
  context.font = font;
  const words = String(text).split(/\s+/);
  let line = "";
  let offsetY = 0;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line, x, y + offsetY);
      line = word;
      offsetY += 12;
    } else {
      line = test;
    }
  });
  if (line) context.fillText(line, x, y + offsetY);
}

function drawMetricTags(context, cell, x, y, maxWidth) {
  const tags = [...cell.querySelectorAll(".tag")];
  let cursorX = x;
  tags.forEach((tag) => {
    const text = tag.innerText.trim();
    const style = getComputedStyle(tag);
    context.font = "700 9.5px Arial";
    const tagWidth = Math.min(maxWidth, Math.ceil(context.measureText(text).width) + 12);
    const bg = style.backgroundColor === "rgba(0, 0, 0, 0)" ? "#ffffff" : style.backgroundColor;
    drawRoundedRect(context, cursorX, y, tagWidth, 20, 8, bg);
    context.fillStyle = style.color || "#344054";
    context.fillText(text, cursorX + 6, y + 13);
    cursorX += tagWidth + 4;
  });
}

function drawRoundedRect(context, x, y, width, height, radius, fill) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
}

async function copyParameterResume() {
  const text = buildWhatsAppResumeText();
  if (!text) {
    showToast("Belum ada resume untuk dicopy.");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("Resume berhasil dicopy.");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("Resume berhasil dicopy.");
  }
}

function buildWhatsAppResumeText() {
  const rows = state.igiRows.filter((row) => row.tgl_proses === state.date && row.kode_kantor !== "905");
  if (!rows.length) return "";

  const activeMetrics = state.metric === "TOTAL_SCORE" || state.metric === "ALL"
    ? metrics
    : metrics.filter((metric) => metric.key === state.metric);
  const indicatorLabel = state.metric === "TOTAL_SCORE"
    ? "Total Score"
    : state.metric === "ALL"
      ? "Semua Indikator"
      : activeMetrics[0]?.label ?? "-";

  if (state.office !== "ALL") {
    const targetRow = rows.find((row) => row.kode_kantor === state.office);
    if (!targetRow) return "";
    const ranked = rankParameterPriorities(targetRow, activeMetrics);
    const parts = [
      "*Resume Quick Win Progress IGI*",
      `Update: *${state.date || "-"}*`,
      `Kantor: *${targetRow.kode_kantor} - ${targetRow.nama_kantor}*`,
      `Indikator: *${indicatorLabel}*`,
      "",
    ];
    if (!ranked.length) {
      parts.push("- Tidak ada parameter prioritas; beban sudah tidak muncul atau nilai sudah maksimal.");
    } else {
      const prediction = buildExecutionPrediction(targetRow, activeMetrics, ranked);
      const top = ranked[0];
      parts.push(`*KERJAKAN DULU:* *${top.metric.label}*.`);
      parts.push(`Sisa beban *${fmtNumber.format(top.burden)}*, nilai saat ini *${fmtDecimal.format(top.score)} dari ${fmtNumber.format(top.maxScore)}*, bobot parameter *${fmtNumber.format(top.maxScore)} poin*. Jika tuntas, nilai parameter ini bisa naik sampai *${fmtNumber.format(top.maxScore)}*.`);
      ranked.slice(1, 4).forEach((item, index) => {
        parts.push(`Prioritas ${index + 2}: *${item.metric.label}*, sisa beban *${fmtNumber.format(item.burden)}*, nilai *${fmtDecimal.format(item.score)} dari ${fmtNumber.format(item.maxScore)}*.`);
      });
      parts.push("");
      parts.push(buildWhatsAppPredictionText(prediction));
    }
    parts.push("");
    parts.push("*Semangat untuk kantor yang masih punya beban:* fokus pada parameter prioritas dulu, karena kontribusi kecil yang konsisten akan cepat terasa pada nilai wilayah.");
    return parts.join("\n").trim();
  }

  const groups = [
    { label: "Cabang Induk", rows: rows.filter((row) => getOfficeClass(row.kode_kantor).key === "main") },
    { label: "KCP", rows: rows.filter((row) => getOfficeClass(row.kode_kantor).key === "kcp") },
  ];
  const parts = [
    "*Resume Quick Win Progress IGI*",
    `Update: *${state.date || "-"}*`,
    `Indikator: *${indicatorLabel}*`,
    "",
  ];

  groups.forEach((group) => {
    parts.push(`*${group.label}*`);
    const lines = activeMetrics.map((metric) => {
      const target = group.rows
        .map((row) => {
          const burden = parseNumber(row[metric.burden]);
          const score = parseNumber(row[metric.score]);
          const maxScore = getMaxScore(metric.key, row.kode_kantor);
          return {
            row,
            burden,
            score,
            maxScore,
            scoreGap: Math.max(0, maxScore - Math.max(0, Math.min(maxScore, score))),
          };
        })
        .filter((item) => item.burden > 0 && item.scoreGap > 0)
        .sort((a, b) => b.burden - a.burden || b.scoreGap - a.scoreGap)[0];

      if (!target) return "";
      return `- *${metric.label}*: gas dulu *${target.row.kode_kantor} - ${target.row.nama_kantor}*, sisa beban *${fmtNumber.format(target.burden)}*, nilai saat ini *${fmtDecimal.format(target.score)} dari ${fmtNumber.format(target.maxScore)}*.`;
    }).filter(Boolean);

    parts.push(lines.length ? lines.join("\n") : "- Tidak ada sisa beban prioritas.");
    parts.push("");
  });

  parts.push("*Semangat untuk kantor yang masih punya beban:* fokus pada parameter prioritas dulu, karena kontribusi kecil yang konsisten akan cepat terasa pada nilai wilayah.");
  return parts.join("\n").trim();
}

function buildWhatsAppPredictionText(prediction) {
  if (!prediction.totalBurden || prediction.potentialGain <= 0) {
    return `*Kesimpulan:* score diprediksi tetap *${fmtDecimal.format(prediction.currentScore)} poin* karena tidak ada gap nilai prioritas pada filter ini.`;
  }
  const basis = prediction.dailyRate
    ? `Basis: rata-rata penurunan terakhir sekitar *${fmtDecimal.format(prediction.dailyRate)} beban/hari*.`
    : `Basis: skenario 1 minggu dengan eksekusi disiplin karena histori penurunan belum cukup.`;
  return `*Kesimpulan:* jika prioritas dieksekusi disiplin selama *1 minggu (${fmtNumber.format(prediction.horizonDays)} hari)*, score diproyeksikan naik dari *${fmtDecimal.format(prediction.currentScore)}* menjadi *${fmtDecimal.format(prediction.predictedScore)} poin* atau bertambah sekitar *+${fmtDecimal.format(prediction.projectedGain)} poin*. ${basis}`;
}

els.officeModeFilter.addEventListener("change", (event) => {
  state.officeMode = event.target.value;
  render();
});
els.officeFilter.addEventListener("change", (event) => {
  state.office = event.target.value;
  render();
});
els.metricFilter.addEventListener("change", (event) => {
  state.metric = event.target.value;
  render();
});
els.trendStart.addEventListener("change", (event) => {
  state.trendStart = inputValueToSheetDate(event.target.value);
  render();
});
els.trendEnd.addEventListener("change", (event) => {
  state.trendEnd = inputValueToSheetDate(event.target.value);
  render();
});
els.resetFilters.addEventListener("click", () => {
  state.date = "LATEST";
  state.office = "ALL";
  state.officeMode = "ALL";
  state.metric = "TOTAL_SCORE";
  state.trendStart = "";
  state.trendEnd = "";
  state.search = "";
  els.searchInput.value = "";
  renderFilters();
  render();
});
els.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim().toLowerCase();
  render();
});
els.metricColumnsButton?.addEventListener("click", () => {
  els.metricColumnsMenu.hidden = !els.metricColumnsMenu.hidden;
  if (els.componentColumnsMenu) els.componentColumnsMenu.hidden = true;
});
els.componentColumnsButton?.addEventListener("click", () => {
  els.componentColumnsMenu.hidden = !els.componentColumnsMenu.hidden;
  if (els.metricColumnsMenu) els.metricColumnsMenu.hidden = true;
});
els.metricColumnsMenu?.addEventListener("change", (event) => {
  if (event.target.type !== "checkbox") return;
  const value = event.target.value;
  state.tableMetrics = event.target.checked
    ? [...new Set([...state.tableMetrics, value])]
    : state.tableMetrics.filter((item) => item !== value);
  render();
  els.metricColumnsMenu.hidden = false;
});
els.componentColumnsMenu?.addEventListener("change", (event) => {
  if (event.target.type !== "checkbox") return;
  const value = event.target.value;
  state.tableComponents = event.target.checked
    ? [...new Set([...state.tableComponents, value])]
    : state.tableComponents.filter((item) => item !== value);
  render();
  els.componentColumnsMenu.hidden = false;
});
document.addEventListener("click", (event) => {
  if (els.metricColumns && !els.metricColumns.contains(event.target)) els.metricColumnsMenu.hidden = true;
  if (els.componentColumns && !els.componentColumns.contains(event.target)) els.componentColumnsMenu.hidden = true;
});
els.tableHead.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sort-key]");
  if (!button) return;
  const key = button.dataset.sortKey;
  state.tableSort = {
    key,
    direction: state.tableSort.key === key && state.tableSort.direction === "asc" ? "desc" : "asc",
  };
  render();
});
els.downloadTableCsv?.addEventListener("click", downloadProgressTableCsv);
els.downloadTableJpg.addEventListener("click", downloadProgressTableJpg);
els.copyParameterResume.addEventListener("click", copyParameterResume);

loadProgress();
