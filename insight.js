const SHEET_ID = "2PACX-1vQtw4zahkq1MPDzwQJDjWRDdUN4ffG8O4aokdiIBvxh_YKvxnQ6-hNpTQXkQoidX8TrHZ0bku-VJE4K";
const SHEETS = {
  igi: "0",
  kpi: "315150517",
};

const metrics = [
  { key: "dup_na", label: "DUP NA", burden: "beban_dup_na", score: "nilai_dup_na" },
  { key: "kel_tk_aktif", label: "Kelengkapan TK Aktif", burden: "beban_kel_tk_aktif", score: "nilai_kel_tk_aktif" },
  { key: "kel_tk_na", label: "Kelengkapan TK NA", burden: "beban_kel_tk_na", score: "nilai_kel_tk_na" },
  { key: "kel_pkbu", label: "Kelengkapan PKBU", burden: "beban_kel_pkbu", score: "nilai_kel_pkbu" },
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
};

const els = {
  sourceNote: document.querySelector("#insightSourceNote"),
  meta: document.querySelector("#insightMeta"),
  refresh: document.querySelector("#refreshInsight"),
  cards: document.querySelector("#insightCards"),
  igiSubtitle: document.querySelector("#igiInsightSubtitle"),
  igiPanel: document.querySelector("#igiInsightPanel"),
  kpiSubtitle: document.querySelector("#kpiInsightSubtitle"),
  kpiPanel: document.querySelector("#kpiInsightPanel"),
  quickWin: document.querySelector("#quickWinInsight"),
  igiTargets: document.querySelector("#igiTargetTables"),
  kpiRanks: document.querySelector("#kpiRankTables"),
  toast: document.querySelector("#toast"),
};

const fmtNumber = new Intl.NumberFormat("id-ID");
const fmtDecimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function sheetCsvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${gid}&single=true&output=csv`;
}

async function loadInsight() {
  setLoading();
  try {
    const [igiText, kpiText] = await Promise.all([
      fetchCsv(sheetCsvUrl(SHEETS.igi)),
      fetchCsv(sheetCsvUrl(SHEETS.kpi)),
    ]);
    state.igiRows = parseCsv(igiText);
    state.kpiRows = parseCsv(kpiText);
    renderInsight();
    showToast("Insight berhasil diperbarui.");
  } catch (error) {
    els.meta.textContent = "Gagal membaca spreadsheet.";
    showToast(error.message);
  }
}

async function fetchCsv(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Gagal membaca spreadsheet: HTTP ${response.status}`);
  return response.text();
}

function renderInsight() {
  const igi = buildIgiAnalysis();
  const kpi = buildKpiAnalysis();
  els.sourceNote.textContent = `Spreadsheet KUALITAS DATA 2026: ${fmtNumber.format(state.igiRows.length)} baris IGI dan ${fmtNumber.format(state.kpiRows.length)} baris KPI.`;
  els.meta.textContent = `Update IGI ${igi.latestDate || "-"} | KPI ${kpi.latestDate || "-"}.`;
  renderExecutiveCards(igi, kpi);
  renderIgiPanel(igi);
  renderKpiPanel(kpi);
  renderQuickWin(igi, kpi);
  renderIgiTargets(igi);
  renderKpiRanks(kpi);
}

function buildIgiAnalysis() {
  const dates = uniqueValues(state.igiRows, "tgl_proses").sort(compareDateAsc);
  const latestDate = dates.at(-1) ?? "";
  const previousDate = dates.at(-2) ?? "";
  const latestRows = state.igiRows.filter((row) => row.tgl_proses === latestDate);
  const previousRows = state.igiRows.filter((row) => row.tgl_proses === previousDate);
  const kanwil = latestRows.find((row) => row.kode_kantor === "905") ?? {};
  const previousKanwil = previousRows.find((row) => row.kode_kantor === "905") ?? null;
  const officeRows = latestRows.filter((row) => row.kode_kantor !== "905");
  const score = parseNumber(kanwil.nilai);
  const previousScore = previousKanwil ? parseNumber(previousKanwil.nilai) : null;
  const burden = sumMetrics(kanwil, metrics, "burden");
  const previousBurden = previousKanwil ? sumMetrics(previousKanwil, metrics, "burden") : null;
  const parameterMovements = metrics.map((metric) => ({
    metric,
    burden: parseNumber(kanwil[metric.burden]),
    delta: previousKanwil ? parseNumber(kanwil[metric.burden]) - parseNumber(previousKanwil[metric.burden]) : null,
    score: parseNumber(kanwil[metric.score]),
  }));
  const targets = officeRows.map((row) => {
    const opportunities = metrics
      .map((metric) => buildIgiOpportunity(row, metric))
      .filter((item) => item.burden > 0 && item.gap > 0.05)
      .sort((a, b) => b.impact - a.impact || a.burden - b.burden);
    const totalGap = opportunities.reduce((sum, item) => sum + item.gap, 0);
    const totalBurden = opportunities.reduce((sum, item) => sum + item.burden, 0);
    return { row, opportunities, totalGap, totalBurden, top: opportunities[0] };
  }).filter((item) => item.top);
  const targetSort = (a, b) => b.totalGap - a.totalGap || a.totalBurden - b.totalBurden;
  return {
    latestDate,
    previousDate,
    kanwil,
    previousKanwil,
    score,
    scoreDelta: previousScore === null ? null : score - previousScore,
    burden,
    burdenDelta: previousBurden === null ? null : burden - previousBurden,
    parameterMovements,
    kciTargets: targets.filter((item) => getOfficeClass(item.row.kode_kantor).key === "main").sort(targetSort).slice(0, 5),
    kcpTargets: targets.filter((item) => getOfficeClass(item.row.kode_kantor).key === "kcp").sort(targetSort).slice(0, 5),
  };
}

function buildKpiAnalysis() {
  const columns = mapKpiColumns(state.kpiRows);
  const dates = uniqueValues(state.kpiRows, columns.date).sort(compareDateAsc);
  const latestDate = dates.at(-1) ?? "";
  const previousDate = dates.at(-2) ?? "";
  const latestRows = state.kpiRows.filter((row) => row[columns.date] === latestDate);
  const previousRows = state.kpiRows.filter((row) => row[columns.date] === previousDate);
  const kanwil = latestRows.find((row) => kpiCode(row, columns) === "905") ?? {};
  const previousKanwil = previousRows.find((row) => kpiCode(row, columns) === "905") ?? null;
  const officeItems = latestRows
    .filter((row) => kpiCode(row, columns) !== "905")
    .map((row) => {
      const previous = previousRows.find((item) => kpiCode(item, columns) === kpiCode(row, columns));
      const burden = kpiInvalid(row, columns);
      const previousBurden = previous ? kpiInvalid(previous, columns) : null;
      return {
        code: kpiCode(row, columns),
        name: kpiName(row, columns),
        officeClass: getOfficeClass(kpiCode(row, columns)).key,
        penalty: kpiPenalty(row, columns),
        burden,
        burdenDelta: previousBurden === null ? null : burden - previousBurden,
      };
    });
  const kci = officeItems.filter((item) => item.officeClass === "main");
  const kcp = officeItems.filter((item) => item.officeClass === "kcp");
  const best = (items) => [...items].sort((a, b) => b.penalty - a.penalty || a.burden - b.burden).slice(0, 3);
  const worst = (items) => [...items].sort((a, b) => a.penalty - b.penalty || b.burden - a.burden).slice(0, 3);
  return {
    columns,
    latestDate,
    previousDate,
    penalty: kpiPenalty(kanwil, columns),
    penaltyDelta: previousKanwil ? kpiPenalty(kanwil, columns) - kpiPenalty(previousKanwil, columns) : null,
    burden: kpiInvalid(kanwil, columns),
    burdenDelta: previousKanwil ? kpiInvalid(kanwil, columns) - kpiInvalid(previousKanwil, columns) : null,
    newInvalid: kpiNewInvalid(kanwil, columns),
    oldInvalid: Math.max(0, kpiInvalid(kanwil, columns) - kpiNewInvalid(kanwil, columns)),
    bestKci: best(kci),
    bestKcp: best(kcp),
    worstKci: worst(kci),
    worstKcp: worst(kcp),
  };
}

function renderExecutiveCards(igi, kpi) {
  els.cards.innerHTML = `
    ${renderInsightCard("Score IGI", fmtDecimal.format(igi.score), igi.scoreDelta, "score")}
    ${renderInsightCard("Sisa Beban IGI", fmtNumber.format(igi.burden), igi.burdenDelta, "burden")}
    ${renderInsightCard("Pengurang KPI NIK", formatSigned(kpi.penalty), kpi.penaltyDelta, "score")}
    ${renderInsightCard("Beban NIK Invalid", fmtNumber.format(kpi.burden), kpi.burdenDelta, "burden")}
  `;
}

function renderInsightCard(label, value, delta, mode) {
  const tone = delta === null || Math.abs(delta) < 0.005 ? "neutral" : mode === "burden" ? (delta < 0 ? "good" : "bad") : (delta > 0 ? "good" : "bad");
  const suffix = mode === "score" ? " poin" : "";
  const deltaText = delta === null ? "Belum ada pembanding" : `${delta > 0 ? "+" : ""}${mode === "score" ? fmtDecimal.format(delta) : fmtNumber.format(delta)}${suffix}`;
  return `
    <article class="insight-executive-card ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(deltaText)}</em>
    </article>
  `;
}

function renderIgiPanel(igi) {
  const tone = igi.scoreDelta === null || Math.abs(igi.scoreDelta) < 0.005 ? "neutral" : igi.scoreDelta > 0 ? "good" : "bad";
  const burdenTone = igi.burdenDelta === null || igi.burdenDelta === 0 ? "neutral" : igi.burdenDelta < 0 ? "good" : "bad";
  const topMovement = [...igi.parameterMovements]
    .filter((item) => item.delta !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  els.igiSubtitle.textContent = `Update ${igi.previousDate || "-"} s.d. ${igi.latestDate || "-"}.`;
  els.igiPanel.innerHTML = `
    <p>Score IGI Kanwil 905 <strong class="${tone}">${igi.scoreDelta >= 0 ? "naik" : "turun"} ${formatSigned(igi.scoreDelta ?? 0)} poin</strong>, menjadi <strong>${fmtDecimal.format(igi.score)}</strong>.</p>
    <p>Sisa beban total <strong class="${burdenTone}">${igi.burdenDelta === null ? "belum ada pembanding" : `${igi.burdenDelta > 0 ? "naik" : igi.burdenDelta < 0 ? "turun" : "tetap"} ${fmtNumber.format(Math.abs(igi.burdenDelta))}`}</strong>, dengan posisi terakhir <strong>${fmtNumber.format(igi.burden)}</strong>.</p>
    <p>${topMovement ? `Pergerakan terbesar ada di <strong>${escapeHtml(topMovement.metric.label)}</strong> sebesar <strong class="${topMovement.delta > 0 ? "bad" : "good"}">${formatSigned(topMovement.delta)}</strong> beban.` : "Belum ada parameter pembanding."}</p>
  `;
}

function renderKpiPanel(kpi) {
  const tone = kpi.penaltyDelta === null || Math.abs(kpi.penaltyDelta) < 0.005 ? "neutral" : kpi.penaltyDelta > 0 ? "good" : "bad";
  const burdenTone = kpi.burdenDelta === null || kpi.burdenDelta === 0 ? "neutral" : kpi.burdenDelta < 0 ? "good" : "bad";
  els.kpiSubtitle.textContent = `Update ${kpi.previousDate || "-"} s.d. ${kpi.latestDate || "-"}; mendekati 0 semakin baik.`;
  els.kpiPanel.innerHTML = `
    <p>Pengurang KPI NIK invalid <strong class="${tone}">${kpi.penaltyDelta >= 0 ? "membaik" : "memburuk"} ${formatSigned(kpi.penaltyDelta ?? 0)} poin</strong>, menjadi <strong>${formatSigned(kpi.penalty)}</strong>.</p>
    <p>Total beban NIK invalid <strong class="${burdenTone}">${kpi.burdenDelta === null ? "belum ada pembanding" : `${kpi.burdenDelta > 0 ? "naik" : kpi.burdenDelta < 0 ? "turun" : "tetap"} ${fmtNumber.format(Math.abs(kpi.burdenDelta))}`}</strong>, posisi terakhir <strong>${fmtNumber.format(kpi.burden)}</strong>.</p>
    <p>Komposisi terakhir: TK baru <strong>${fmtNumber.format(kpi.newInvalid)}</strong> dan TK lama <strong>${fmtNumber.format(kpi.oldInvalid)}</strong>.</p>
  `;
}

function renderQuickWin(igi, kpi) {
  const igiTarget = [...igi.kciTargets, ...igi.kcpTargets].sort((a, b) => b.totalGap - a.totalGap || a.totalBurden - b.totalBurden)[0];
  const kpiTarget = [...kpi.worstKci, ...kpi.worstKcp].sort((a, b) => a.penalty - b.penalty || b.burden - a.burden)[0];
  els.quickWin.innerHTML = `
    <div class="quickwin-priority insight-priority">
      <b>KERJAKAN DULU</b>
      <span>${igiTarget ? `IGI: ${escapeHtml(igiTarget.row.kode_kantor)} - ${escapeHtml(igiTarget.row.nama_kantor)} pada ${escapeHtml(igiTarget.top.metric.label)} karena masih punya gap ${fmtDecimal.format(igiTarget.top.gap)} poin.` : "IGI belum memiliki target prioritas aktif."}</span>
    </div>
    <div class="quickwin-priority insight-priority">
      <b>TEKAN KPI NIK</b>
      <span>${kpiTarget ? `${escapeHtml(kpiTarget.code)} - ${escapeHtml(kpiTarget.name)} perlu digas karena score pengurang masih ${formatSigned(kpiTarget.penalty)} dengan ${fmtNumber.format(kpiTarget.burden)} NIK invalid.` : "KPI NIK belum memiliki target prioritas aktif."}</span>
    </div>
    <p>Strategi gabungan: jalankan perbaikan IGI berbasis parameter dengan gap poin terbesar, sambil menurunkan NIK invalid di kantor dengan pengurang KPI paling dalam. Dua jalur ini membuat score IGI naik dan pengurang KPI bergerak mendekati 0.</p>
  `;
}

function renderIgiTargets(igi) {
  els.igiTargets.innerHTML = `
    <div class="insight-table-grid">
      ${renderIgiTargetTable("5 KCI Prioritas IGI", igi.kciTargets)}
      ${renderIgiTargetTable("5 KCP Prioritas IGI", igi.kcpTargets)}
    </div>
  `;
}

function renderIgiTargetTable(title, items) {
  return `
    <section class="insight-mini-table">
      <h3>${escapeHtml(title)}</h3>
      <table class="pivot-table compact-table">
        <thead><tr><th>Kode</th><th>Kantor</th><th>Fokus</th><th class="num">Gap</th></tr></thead>
        <tbody>
          ${items.length ? items.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.row.kode_kantor)}</strong></td>
              <td>${escapeHtml(item.row.nama_kantor)}</td>
              <td>${escapeHtml(item.top.metric.label)}</td>
              <td class="num">${fmtDecimal.format(item.top.gap)}</td>
            </tr>
          `).join("") : `<tr><td colspan="4" class="empty">Tidak ada target.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function renderKpiRanks(kpi) {
  els.kpiRanks.innerHTML = `
    <div class="insight-table-grid four">
      ${renderKpiRankTable("3 KCI Terbaik", kpi.bestKci, "good")}
      ${renderKpiRankTable("3 KCP Terbaik", kpi.bestKcp, "good")}
      ${renderKpiRankTable("3 KCI Terjelek", kpi.worstKci, "bad")}
      ${renderKpiRankTable("3 KCP Terjelek", kpi.worstKcp, "bad")}
    </div>
  `;
}

function renderKpiRankTable(title, items, tone) {
  return `
    <section class="insight-mini-table">
      <h3>${escapeHtml(title)}</h3>
      <table class="pivot-table compact-table">
        <thead><tr><th>Kode</th><th>Kantor</th><th class="num">Pengurang</th></tr></thead>
        <tbody>
          ${items.length ? items.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.code)}</strong></td>
              <td>${escapeHtml(item.name)}</td>
              <td class="num ${tone}">${formatSigned(item.penalty)}</td>
            </tr>
          `).join("") : `<tr><td colspan="3" class="empty">Tidak ada data.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function buildIgiOpportunity(row, metric) {
  const maxScore = getMaxScore(metric.key, row.kode_kantor);
  const score = parseNumber(row[metric.score]);
  const burden = parseNumber(row[metric.burden]);
  const gap = Math.max(0, maxScore - score);
  return { metric, maxScore, score, burden, gap, impact: gap / Math.max(1, burden) };
}

function mapKpiColumns(rows) {
  const headers = Object.keys(rows[0] ?? {});
  const byNorm = new Map(headers.map((header) => [normalizeKey(header), header]));
  const pick = (...candidates) => candidates.map(normalizeKey).map((key) => byNorm.get(key)).find(Boolean);
  return {
    date: pick("tgl_proses"),
    code: pick("kode_kantor", "kode_cabang", "kode kantor"),
    name: pick("nama_kantor", "nama_cabang", "nama kantor"),
    newInvalid: pick("tk_baru_nik_invalid", "tk baru nik invalid"),
    invalid: pick("tk_aktif_baru_nik_invalid", "tk aktif baru nik invalid", "tk_aktif_nik_invalid", "nik_invalid"),
    value: pick("pengurang_tk_aktif_baru", "pengurang_tk_aktif", "pengurang_tkaktif", "pengurang tk aktif", "pengurang_tk)aktif"),
  };
}

function kpiCode(row, columns) {
  return String(row?.[columns.code] ?? "").trim();
}

function kpiName(row, columns) {
  return String(row?.[columns.name] ?? "").trim() || "-";
}

function kpiPenalty(row, columns) {
  const raw = Math.abs(parseNumber(row?.[columns.value]));
  return raw ? -raw : 0;
}

function kpiInvalid(row, columns) {
  return Math.abs(parseNumber(row?.[columns.invalid]));
}

function kpiNewInvalid(row, columns) {
  return Math.abs(parseNumber(row?.[columns.newInvalid]));
}

function getOfficeClass(code) {
  const text = String(code ?? "").trim().toUpperCase();
  const match = text.match(/^L(\d{2})$/);
  if (!match) return { key: "main", label: "Cabang Induk" };
  const number = Number(match[1]);
  if (number >= 12 && number <= 34) return { key: "kcp", label: "KCP" };
  return { key: "main", label: "Cabang Induk" };
}

function getMaxScore(metricKey, officeCode) {
  const officeClass = getOfficeClass(officeCode);
  const rule = maxScores[metricKey];
  if (!rule) return 0;
  return officeClass.key === "kcp" ? rule.kcp : rule.main;
}

function sumMetrics(row, selectedMetrics, key) {
  return selectedMetrics.reduce((sum, metric) => sum + parseNumber(row?.[metric[key]]), 0);
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

function parseNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : /^-?\d{1,3}(\.\d{3})+(\.\d+)?$/.test(raw)
      ? raw.replace(/\./g, "")
      : raw.replace(/,/g, "");
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
  const parsed = new Date(text).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareDateAsc(a, b) {
  return parseDate(a) - parseDate(b);
}

function uniqueValues(rows, column) {
  if (!column) return [];
  return [...new Set(rows.map((row) => String(row[column] ?? "").trim()).filter(Boolean))];
}

function normalizeKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatSigned(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) < 0.005) return "0";
  return number > 0 ? `+${fmtDecimal.format(number)}` : `-${fmtDecimal.format(Math.abs(number))}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setLoading() {
  els.meta.textContent = "Memuat spreadsheet...";
  els.cards.innerHTML = `<p class="empty">Memuat insight...</p>`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 3600);
}

els.refresh.addEventListener("click", loadInsight);
loadInsight();
