const datasets = [
  {
    key: "pkbuProfiler.activeData.v1",
    title: "Kelengkapan PKBU",
    rowLabel: "NPP/perusahaan",
    storageLabel: "PKBU",
  },
  {
    key: "tkAktifProfiler.activeData.v1",
    title: "Kelengkapan TK Aktif",
    rowLabel: "TK aktif",
    storageLabel: "TK Aktif",
  },
  {
    key: "tkNaProfiler.activeData.v1",
    title: "Kelengkapan TK NA",
    rowLabel: "TK NA",
    storageLabel: "TK NA",
  },
];

const KPI_SHEET_ID = "2PACX-1vQtw4zahkq1MPDzwQJDjWRDdUN4ffG8O4aokdiIBvxh_YKvxnQ6-hNpTQXkQoidX8TrHZ0bku-VJE4K";
const KPI_GID = "315150517";
const IGI_GID = "0";

const igiMetrics = [
  { key: "dup_na", label: "DUP NA", burden: "beban_dup_na", score: "nilai_dup_na" },
  { key: "kel_tk_aktif", label: "TK AKTIF", burden: "beban_kel_tk_aktif", score: "nilai_kel_tk_aktif" },
  { key: "kel_tk_na", label: "TK NA", burden: "beban_kel_tk_na", score: "nilai_kel_tk_na" },
  { key: "kel_pkbu", label: "PKBU", burden: "beban_kel_pkbu", score: "nilai_kel_pkbu" },
];

const els = {
  sourceNote: document.querySelector("#summarySourceNote"),
  summaryMeta: document.querySelector("#summaryMeta"),
  refreshSummary: document.querySelector("#refreshSummary"),
  downloadPdf: document.querySelector("#downloadPdf"),
  summarySections: document.querySelector("#summarySections"),
  summaryKpiSubtitle: document.querySelector("#summaryKpiSubtitle"),
  summaryKpiPanel: document.querySelector("#summaryKpiPanel"),
  summaryHeatmapSubtitle: document.querySelector("#summaryHeatmapSubtitle"),
  summaryHeatmapPanel: document.querySelector("#summaryHeatmapPanel"),
};

const fmtNumber = new Intl.NumberFormat("id-ID");
const fmtPct = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 1 });
const fmtDecimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const officeLookup = new Map([
  ["L00", "Semarang Pemuda"],
  ["L01", "Surakarta"],
  ["L02", "Cilacap"],
  ["L03", "Yogyakarta"],
  ["L04", "Pekalongan"],
  ["L05", "Kudus"],
  ["L06", "Magelang"],
  ["L07", "Tegal"],
  ["L08", "Klaten"],
  ["L09", "Purwokerto"],
  ["L10", "Ungaran"],
  ["L11", "Semarang Majapahit"],
  ["L12", "Sukoharjo Slamet Riyadi"],
  ["L13", "Sleman Godean"],
  ["L14", "Boyolali Randusari"],
  ["L15", "Purbalingga Ahmad Yani"],
  ["L16", "Bantul Ringin Harjo"],
  ["L17", "Gunung Kidul Wonosari"],
  ["L18", "Kulon Progo Wates"],
  ["L19", "Jepara Wahid Hasyim"],
  ["L20", "Pati Susanto"],
  ["L21", "Grobogan Purwodadi"],
  ["L22", "Karanganyar Triyagan"],
  ["L23", "Pemalang Perintis Kemerdekaan"],
  ["L24", "Sragen Sukowati"],
  ["L25", "Kebumen Pemuda"],
  ["L26", "Banjarnegara Pemuda"],
  ["L27", "Blora Ahmad Yani"],
  ["L28", "Batang Kauman"],
  ["L29", "Temanggung Kertosari"],
  ["L30", "Purworejo Tentara Pelajar"],
  ["L31", "Wonosobo Muntang"],
  ["L32", "Rembang Kartini"],
  ["L33", "Brebes Ahmad Yani"],
  ["L34", "Kendal Soekarno Hatta"],
  ["905", "Kanwil Jateng DIY"],
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function officeLabel(code) {
  const key = String(code ?? "").trim();
  const name = officeLookup.get(key);
  return name ? `${key} - ${name}` : key || "-";
}

function officeType(code) {
  const key = String(code ?? "").trim().toUpperCase();
  if (key === "905") return "Kanwil";
  const match = key.match(/^L(\d{2})$/);
  if (!match) return "Lainnya";
  const number = Number(match[1]);
  if (number <= 11) return "Cabang";
  if (number <= 34) return "KCP";
  return "Lainnya";
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

function normalizeKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
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

function mapKpiColumns(rows) {
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

function kpiSheetCsvUrl() {
  return `https://docs.google.com/spreadsheets/d/e/${KPI_SHEET_ID}/pub?gid=${KPI_GID}&single=true&output=csv`;
}

function sheetCsvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/e/${KPI_SHEET_ID}/pub?gid=${gid}&single=true&output=csv`;
}

function kpiRead(row, columns, key) {
  return row?.[columns[key]] ?? "";
}

function kpiCode(row, columns) {
  return String(kpiRead(row, columns, "code")).trim();
}

function kpiName(row, columns) {
  return String(kpiRead(row, columns, "name")).trim() || officeLookup.get(kpiCode(row, columns)) || "-";
}

function kpiPenalty(row, columns) {
  const raw = Math.abs(parseNumber(kpiRead(row, columns, "value")));
  return raw ? -raw : 0;
}

function kpiInvalid(row, columns) {
  return Math.abs(parseNumber(kpiRead(row, columns, "invalid")));
}

function kpiNewInvalid(row, columns) {
  return Math.abs(parseNumber(kpiRead(row, columns, "newInvalid")));
}

function kpiOldInvalid(row, columns) {
  return Math.max(0, kpiInvalid(row, columns) - kpiNewInvalid(row, columns));
}

function formatSigned(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) < 0.005) return "0";
  return number > 0 ? `+${fmtDecimal.format(number)}` : `-${fmtDecimal.format(Math.abs(number))}`;
}

function parseDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
  const parsed = new Date(text).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function monthKey(value) {
  const time = parseDate(value);
  if (!time) return "";
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatFullDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}-${match[3]}`;
}

function formatKpiTrendDate(value, latestMonth) {
  const time = parseDate(value);
  if (!time) return value;
  const date = new Date(time);
  const month = monthShortNames[date.getMonth()];
  return monthKey(value) === latestMonth ? `${String(date.getDate()).padStart(2, "0")}-${month}` : month;
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
  return Math.max(count, 1);
}

function openProfilerDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("qualityProfilerDb", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("datasets");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  const db = await openProfilerDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("datasets", "readonly");
    const request = tx.objectStore("datasets").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbDelete(key) {
  const db = await openProfilerDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("datasets", "readwrite");
    tx.objectStore("datasets").delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isStoredDataExpired(saved) {
  if (!saved?.savedAt) return true;
  return localDateKey(saved.savedAt) !== localDateKey();
}

function groupBy(rows, column, amountColumn) {
  const groups = new Map();
  for (const row of rows) {
    const name = String(row[column] ?? "Kosong").trim() || "Kosong";
    const current = groups.get(name) ?? { name, total: 0, rows: 0 };
    current.total += parseNumber(row[amountColumn]);
    current.rows += 1;
    groups.set(name, current);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

function countProblemRows(rows) {
  const idColumn = rows.some((row) => row["Kode TK"]) ? "Kode TK" : "NPP";
  const unique = new Set(rows.map((row) => String(row[idColumn] ?? "").trim()).filter(Boolean));
  return unique.size || rows.length;
}

function summarizeDataset(config, data) {
  if (!data?.rows?.length) return { ...config, loaded: false };
  const rows = data.rows;
  const mapping = data.mapping;
  const amountColumn = mapping.amount;
  const total = rows.reduce((sum, row) => sum + parseNumber(row[amountColumn]), 0);
  const elementGroups = groupBy(rows, mapping.elemen, amountColumn);
  const branchGroups = groupBy(rows, mapping.cabang, amountColumn);
  const enrichBranch = (branch) => {
    const branchRows = rows.filter((row) => String(row[mapping.cabang] ?? "").trim() === branch.name);
    const topElement = groupBy(branchRows, mapping.elemen, amountColumn)[0];
    return {
      ...branch,
      officeType: officeType(branch.name),
      topElement: topElement?.name ?? "-",
      topElementTotal: topElement?.total ?? 0,
      share: total ? branch.total / total : 0,
    };
  };
  const enrichedBranches = branchGroups.map(enrichBranch);
  const topBranches = enrichedBranches.slice(0, 5);
  const topCabang = enrichedBranches.filter((branch) => branch.officeType === "Cabang").slice(0, 5);
  const topKcp = enrichedBranches.filter((branch) => branch.officeType === "KCP").slice(0, 5);

  return {
    ...config,
    loaded: true,
    rows,
    fileName: data.fileName ?? "-",
    savedAt: data.savedAt ?? null,
    total,
    problemRows: countProblemRows(rows),
    elementGroups,
    branchGroups,
    topBranches,
    topCabang,
    topKcp,
    topElement: elementGroups[0],
    topBranch: branchGroups[0],
  };
}

function barList(items, total, options = {}) {
  if (!items.length) return `<p class="empty">Belum ada data.</p>`;
  const max = Math.max(...items.map((item) => item.total), 1);
  return items.map((item) => {
    const width = Math.max(1, item.total / max * 100);
    const label = options.labelFn ? options.labelFn(item.name) : item.name;
    return `
      <div class="bar-row">
        <div class="bar-meta">
          <span title="${escapeHtml(label)}">${escapeHtml(label)}</span>
          <em>${fmtPct.format(total ? item.total / total : 0)}</em>
          <strong>${fmtNumber.format(item.total)} temuan</strong>
        </div>
        <div class="bar-track"><i style="--bar:${width.toFixed(2)}%"></i></div>
      </div>
    `;
  }).join("");
}

function paretoTable(items, emptyLabel) {
  if (!items.length) return `<p class="empty">${escapeHtml(emptyLabel)}</p>`;
  return `
    <div class="table-wrap summary-table-wrap">
      <table class="pivot-table">
        <thead>
          <tr>
            <th>Cabang</th>
            <th class="num">Total</th>
            <th class="num">Share</th>
            <th>Elemen</th>
            <th class="num">Temuan</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((branch) => `
            <tr>
              <td><strong>${escapeHtml(officeLabel(branch.name))}</strong></td>
              <td class="num">${fmtNumber.format(branch.total)}</td>
              <td class="num">${fmtPct.format(branch.share)}</td>
              <td>${escapeHtml(branch.topElement)}</td>
              <td class="num">${fmtNumber.format(branch.topElementTotal)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function improvementInsight(summary) {
  if (!summary.loaded) return ["Upload data pada halaman profiling terkait untuk menampilkan summary."];
  const top3Elements = summary.elementGroups.slice(0, 3);
  const topCabangShare = summary.topCabang.reduce((sum, item) => sum + item.total, 0) / Math.max(summary.total, 1);
  const topKcpShare = summary.topKcp.reduce((sum, item) => sum + item.total, 0) / Math.max(summary.total, 1);
  return [
    `Prioritas elemen: ${top3Elements.map((item) => `${item.name} (${fmtNumber.format(item.total)})`).join(", ")}.`,
    `Fokus Cabang: top 5 cabang menampung ${fmtPct.format(topCabangShare)} dari total temuan.`,
    `Fokus KCP: top 5 KCP menampung ${fmtPct.format(topKcpShare)} dari total temuan.`,
    `${officeLabel(summary.topBranch?.name)} menjadi target pertama; elemen terbesar di unit ini adalah ${summary.topBranches[0]?.topElement ?? "-"} (${fmtNumber.format(summary.topBranches[0]?.topElementTotal ?? 0)} temuan).`,
  ];
}

function insightList(summary) {
  return improvementInsight(summary).map((line) => `<i>${escapeHtml(line)}</i>`).join("");
}

async function loadSummaryHeatmaps() {
  if (!els.summaryHeatmapPanel) return;
  els.summaryHeatmapPanel.innerHTML = `<div class="summary-empty">Memuat heatmap sisa beban...</div>`;
  try {
    const [igiResponse, kpiResponse] = await Promise.all([
      fetch(sheetCsvUrl(IGI_GID), { cache: "no-store" }),
      fetch(sheetCsvUrl(KPI_GID), { cache: "no-store" }),
    ]);
    if (!igiResponse.ok) throw new Error(`IGI HTTP ${igiResponse.status}`);
    if (!kpiResponse.ok) throw new Error(`KPI HTTP ${kpiResponse.status}`);
    const igiRows = parseCsv(await igiResponse.text());
    const kpiRows = parseCsv(await kpiResponse.text());
    const heatmap = buildHeatmapData(igiRows, kpiRows);
    renderSummaryHeatmaps(heatmap);
  } catch (error) {
    els.summaryHeatmapSubtitle.textContent = "Heatmap belum bisa dimuat.";
    els.summaryHeatmapPanel.innerHTML = `<div class="summary-empty">Gagal memuat heatmap: ${escapeHtml(error.message)}.</div>`;
  }
}

function buildHeatmapData(igiRows, kpiRows) {
  const igiDates = [...new Set(igiRows.map((row) => String(row.tgl_proses ?? "").trim()).filter(Boolean))]
    .sort((a, b) => parseDate(a) - parseDate(b));
  const latestIgiDate = igiDates.at(-1) ?? "";
  const previousIgiDate = igiDates.at(-2) ?? "";
  const latestIgiRows = igiRows.filter((row) => row.tgl_proses === latestIgiDate && row.kode_kantor !== "905");
  const previousIgiRows = igiRows.filter((row) => row.tgl_proses === previousIgiDate && row.kode_kantor !== "905");
  const latestIgiKanwil = igiRows.find((row) => row.tgl_proses === latestIgiDate && String(row.kode_kantor ?? "").trim() === "905");
  const previousIgiKanwil = igiRows.find((row) => row.tgl_proses === previousIgiDate && String(row.kode_kantor ?? "").trim() === "905");
  const previousIgiByCode = new Map(
    previousIgiRows.map((row) => [String(row.kode_kantor ?? "").trim(), row])
  );

  const kpiColumns = mapKpiColumns(kpiRows);
  const kpiDates = [...new Set(kpiRows.map((row) => String(kpiRead(row, kpiColumns, "date")).trim()).filter(Boolean))]
    .sort((a, b) => parseDate(a) - parseDate(b));
  const latestKpiDate = kpiDates.at(-1) ?? "";
  const previousKpiDate = kpiDates.at(-2) ?? "";
  const latestKpiRows = kpiRows.filter((row) => kpiRead(row, kpiColumns, "date") === latestKpiDate && kpiCode(row, kpiColumns) !== "905");
  const previousKpiRows = kpiRows.filter((row) => kpiRead(row, kpiColumns, "date") === previousKpiDate && kpiCode(row, kpiColumns) !== "905");
  const latestKpiByCode = aggregateKpiRowsByOffice(latestKpiRows, kpiColumns);
  const previousKpiByCode = aggregateKpiRowsByOffice(previousKpiRows, kpiColumns);

  const igiItems = latestIgiRows.map((row) => {
    const code = String(row.kode_kantor ?? "").trim();
    const previous = previousIgiByCode.get(code);
    const score = parseNumber(row.nilai);
    const previousScore = previous ? parseNumber(previous.nilai) : null;
    return {
      code,
      name: String(row.nama_kantor ?? "").trim(),
      officeType: officeType(row.kode_kantor),
      score,
      scoreProgress: previousScore === null ? null : score - previousScore,
      burdens: Object.fromEntries(igiMetrics.map((metric) => [metric.key, parseNumber(row[metric.burden])])),
      burdenProgress: Object.fromEntries(igiMetrics.map((metric) => {
        const value = parseNumber(row[metric.burden]);
        const previousValue = previous ? parseNumber(previous[metric.burden]) : null;
        return [metric.key, previousValue === null ? null : value - previousValue];
      })),
    };
  });

  const kpiItems = [...latestKpiByCode.values()].map((item) => {
    const previous = previousKpiByCode.get(item.code);
    const previousInvalid = previous ? previous.invalid : null;
    return {
      code: item.code,
      name: item.name,
      officeType: officeType(item.code),
      invalid: item.invalid,
      progress: previousInvalid === null ? null : item.invalid - previousInvalid,
      penalty: item.penalty,
    };
  });

  const split = (items) => ({
    cabang: items.filter((item) => item.officeType === "Cabang"),
    kcp: items.filter((item) => item.officeType === "KCP"),
  });
  const kpiSplit = split(kpiItems);
  kpiSplit.kanwil = buildKpiKanwilHeatmapItem(latestKpiByCode, previousKpiByCode);
  const igiSplit = split(igiItems);
  igiSplit.kanwil = buildIgiKanwilHeatmapItem(latestIgiRows, previousIgiRows, latestIgiKanwil, previousIgiKanwil);

  return {
    igiDate: latestIgiDate,
    kpiDate: latestKpiDate,
    igi: igiSplit,
    kpi: kpiSplit,
  };
}

function buildKpiKanwilHeatmapItem(latestByCode, previousByCode) {
  const latestItems = [...latestByCode.values()];
  const previousItems = [...previousByCode.values()];
  const invalid = latestItems.reduce((sum, item) => sum + item.invalid, 0);
  const previousInvalid = previousItems.reduce((sum, item) => sum + item.invalid, 0);
  const penaltyRaw = latestItems.reduce((sum, item) => sum + Math.abs(item.penalty), 0);
  return {
    code: "905",
    name: "Kanwil Jateng DIY",
    officeType: "Kanwil",
    invalid,
    progress: invalid - previousInvalid,
    penalty: penaltyRaw ? -penaltyRaw : 0,
  };
}

function buildIgiKanwilHeatmapItem(latestRows, previousRows, latestKanwil, previousKanwil) {
  const latestBurdens = Object.fromEntries(igiMetrics.map((metric) => [
    metric.key,
    latestRows.reduce((sum, row) => sum + parseNumber(row[metric.burden]), 0),
  ]));
  const previousBurdens = Object.fromEntries(igiMetrics.map((metric) => [
    metric.key,
    previousRows.reduce((sum, row) => sum + parseNumber(row[metric.burden]), 0),
  ]));
  const score = parseNumber(latestKanwil?.nilai);
  const previousScore = previousKanwil ? parseNumber(previousKanwil.nilai) : null;
  return {
    code: "905",
    name: "Kanwil Jateng DIY",
    officeType: "Kanwil",
    score,
    scoreProgress: previousScore === null ? null : score - previousScore,
    burdens: latestBurdens,
    burdenProgress: Object.fromEntries(igiMetrics.map((metric) => [
      metric.key,
      latestBurdens[metric.key] - previousBurdens[metric.key],
    ])),
  };
}

function aggregateKpiRowsByOffice(rows, columns) {
  const groups = new Map();
  for (const row of rows) {
    const code = kpiCode(row, columns);
    if (!code) continue;
    const current = groups.get(code) ?? {
      code,
      name: kpiName(row, columns),
      invalid: 0,
      penaltyRaw: 0,
    };
    current.invalid += kpiInvalid(row, columns);
    current.penaltyRaw += Math.abs(parseNumber(kpiRead(row, columns, "value")));
    groups.set(code, current);
  }
  for (const item of groups.values()) {
    item.penalty = item.penaltyRaw ? -item.penaltyRaw : 0;
  }
  return groups;
}

function renderSummaryHeatmaps(data) {
  els.summaryHeatmapSubtitle.textContent = `KPI update ${formatFullDate(data.kpiDate)} | IGI update ${formatFullDate(data.igiDate)}. Warna merah menandai beban lebih berat.`;
  els.summaryHeatmapPanel.innerHTML = `
    <section class="heatmap-block">
      <div class="heatmap-title">
        <div>
          <h3>Sisa Beban NIK Invalid dan Pengurang KPI</h3>
          <p>Pengurang paling dekat 0 adalah yang terbaik; progress merah berarti beban bertambah.</p>
        </div>
      </div>
      ${renderKpiHeatmapTable("Kanwil", [data.kpi.kanwil], { aggregate: true })}
      <div class="heatmap-split">
        ${renderKpiHeatmapTable("Cabang Induk", data.kpi.cabang)}
        ${renderKpiHeatmapTable("KCP", data.kpi.kcp)}
      </div>
    </section>
    <section class="heatmap-block">
      <div class="heatmap-title">
        <div>
          <h3>Capaian dan Sisa Beban IGI per Parameter</h3>
          <p>Nilai makin tinggi makin baik; kolom parameter menunjukkan sisa beban yang perlu diselesaikan.</p>
        </div>
      </div>
      ${renderIgiHeatmapTable("Kanwil", [data.igi.kanwil], { aggregate: true })}
      <div class="heatmap-split">
        ${renderIgiHeatmapTable("Cabang Induk", data.igi.cabang)}
        ${renderIgiHeatmapTable("KCP", data.igi.kcp)}
      </div>
    </section>
  `;
}

function renderKpiHeatmapTable(title, items, options = {}) {
  const sorted = [...items].sort((a, b) => a.invalid - b.invalid || b.penalty - a.penalty);
  const invalidValues = sorted.map((item) => item.invalid);
  const penaltyValues = sorted.map((item) => Math.abs(item.penalty));
  const progressValues = sorted.map((item) => item.progress ?? 0);
  const total = sorted.reduce((sum, item) => sum + item.invalid, 0);
  const totalProgress = sorted.reduce((sum, item) => sum + (item.progress ?? 0), 0);
  const totalPenalty = sorted.reduce((sum, item) => sum + item.penalty, 0);
  return `
    <section class="heatmap-table-panel ${options.aggregate ? "heatmap-aggregate-panel" : ""}">
      <div class="heatmap-subhead">
        <h4>${escapeHtml(title)}</h4>
        <span>${fmtNumber.format(sorted.length)} unit. Total NIK invalid ${fmtNumber.format(total)}.</span>
      </div>
      <div class="table-wrap heatmap-table-wrap">
        <table class="heatmap-table">
          <thead>
            <tr>
              <th>Kode / Nama Kantor</th>
              <th class="num">NIK Invalid</th>
              <th class="num">Progress</th>
              <th class="num">Pengurang KPI</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.code)}</strong> ${escapeHtml(item.name)}</td>
                <td class="num" style="${heatStyle(item.invalid, invalidValues, false)}">${fmtNumber.format(item.invalid)}</td>
                <td class="num" style="${progressHeatStyle(item.progress)}">${item.progress === null ? "-" : formatSignedInteger(item.progress)}</td>
                <td class="num" style="${heatStyle(Math.abs(item.penalty), penaltyValues, false)}">${formatSigned(item.penalty)}</td>
              </tr>
            `).join("")}
          </tbody>
          ${options.aggregate ? "" : `
            <tfoot>
              <tr>
                <td><strong>TOTAL</strong></td>
                <td class="num">${fmtNumber.format(total)}</td>
                <td class="num ${totalProgress < 0 ? "total-good" : totalProgress > 0 ? "total-bad" : ""}">${formatSignedInteger(totalProgress)}</td>
                <td class="num">${formatSigned(totalPenalty)}</td>
              </tr>
            </tfoot>
          `}
        </table>
      </div>
    </section>
  `;
}

function renderIgiHeatmapTable(title, items, options = {}) {
  const sorted = [...items].sort((a, b) => b.score - a.score || sumObjectValues(a.burdens) - sumObjectValues(b.burdens));
  const scoreValues = sorted.map((item) => item.score);
  const burdenValuesByMetric = Object.fromEntries(igiMetrics.map((metric) => [metric.key, sorted.map((item) => item.burdens[metric.key] ?? 0)]));
  const total = sorted.reduce((sum, item) => sum + sumObjectValues(item.burdens), 0);
  const averageScore = sorted.length ? sorted.reduce((sum, item) => sum + item.score, 0) / sorted.length : 0;
  const totalScoreProgress = sorted.reduce((sum, item) => sum + (item.scoreProgress ?? 0), 0);
  const totalBurdens = Object.fromEntries(igiMetrics.map((metric) => [
    metric.key,
    sorted.reduce((sum, item) => sum + (item.burdens[metric.key] ?? 0), 0),
  ]));
  const totalBurdenProgress = Object.fromEntries(igiMetrics.map((metric) => [
    metric.key,
    sorted.reduce((sum, item) => sum + (item.burdenProgress[metric.key] ?? 0), 0),
  ]));
  return `
    <section class="heatmap-table-panel ${options.aggregate ? "heatmap-aggregate-panel" : ""}">
      <div class="heatmap-subhead">
        <h4>${escapeHtml(title)}</h4>
        <span>${fmtNumber.format(sorted.length)} unit. Total sisa beban ${fmtNumber.format(total)}.</span>
      </div>
      <div class="table-wrap heatmap-table-wrap">
        <table class="heatmap-table">
          <thead>
            <tr>
              <th>Kode / Nama Kantor</th>
              <th class="num">Nilai</th>
              ${igiMetrics.map((metric) => `<th class="num">${escapeHtml(metric.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${sorted.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.code)}</strong> ${escapeHtml(item.name)}</td>
                <td class="num" style="${options.aggregate ? progressAwareHeatStyle(item.scoreProgress, "score", heatStyle(item.score, scoreValues, true)) : heatStyle(item.score, scoreValues, true)}">${renderHeatmapValueWithProgress(fmtDecimal.format(item.score), item.scoreProgress, "score")}</td>
                ${igiMetrics.map((metric) => {
                  const value = item.burdens[metric.key] ?? 0;
                  const style = options.aggregate
                    ? progressAwareHeatStyle(item.burdenProgress[metric.key], "burden", heatStyle(value, burdenValuesByMetric[metric.key], false))
                    : heatStyle(value, burdenValuesByMetric[metric.key], false);
                  return `<td class="num" style="${style}">${renderHeatmapValueWithProgress(fmtNumber.format(value), item.burdenProgress[metric.key], "burden")}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
          ${options.aggregate ? "" : `
            <tfoot>
              <tr>
                <td><strong>TOTAL</strong></td>
                <td class="num">${renderHeatmapValueWithProgress(fmtDecimal.format(averageScore), totalScoreProgress, "score")}</td>
                ${igiMetrics.map((metric) => `
                  <td class="num">${renderHeatmapValueWithProgress(fmtNumber.format(totalBurdens[metric.key]), totalBurdenProgress[metric.key], "burden")}</td>
                `).join("")}
              </tr>
            </tfoot>
          `}
        </table>
      </div>
    </section>
  `;
}

function renderHeatmapValueWithProgress(value, progress, mode) {
  const progressHtml = progress === null || Math.abs(progress) < 0.005
    ? `<small class="heatmap-progress neutral">(0)</small>`
    : `<small class="heatmap-progress ${heatmapProgressClass(progress, mode)}">(${formatSignedProgress(progress)})</small>`;
  return `<span class="heatmap-value">${escapeHtml(value)}</span>${progressHtml}`;
}

function heatmapProgressClass(progress, mode) {
  if (mode === "score") return progress > 0 ? "good" : "bad";
  return progress < 0 ? "good" : "bad";
}

function progressAwareHeatStyle(progress, mode, fallbackStyle) {
  if (progress === null || Math.abs(progress) < 0.005) return fallbackStyle;
  const isGood = mode === "score" ? progress > 0 : progress < 0;
  return isGood
    ? "background:#d8f3e8;color:#064e3b;"
    : "background:#f7a7ad;color:#7f1d1d;";
}

function formatSignedProgress(value) {
  const formatted = Math.abs(value) % 1 === 0
    ? fmtNumber.format(Math.abs(value))
    : fmtDecimal.format(Math.abs(value));
  return `${value > 0 ? "+" : "-"}${formatted}`;
}

function heatStyle(value, values, higherIsBetter) {
  const finiteValues = values.filter((item) => Number.isFinite(item));
  const min = Math.min(...finiteValues, 0);
  const max = Math.max(...finiteValues, 1);
  const ratio = max === min ? 0 : (value - min) / (max - min);
  const badness = higherIsBetter ? 1 - ratio : ratio;
  if (badness <= 0.2) return "background:#d8f3e8;color:#064e3b;";
  if (badness <= 0.45) return "background:#e8f7ef;color:#064e3b;";
  if (badness <= 0.7) return "background:#fff2c8;color:#7a4500;";
  if (badness <= 0.88) return "background:#ffd8d8;color:#8a1f17;";
  return "background:#f7a7ad;color:#7f1d1d;";
}

function progressHeatStyle(value) {
  if (value === null || value === 0) return "background:#eef3f8;color:#344054;";
  if (value < 0) return "background:#d8f3e8;color:#047857;";
  if (value <= 5) return "background:#ffe5e5;color:#b42318;";
  return "background:#f8a6ad;color:#8a1f17;";
}

function sumObjectValues(values) {
  return Object.values(values).reduce((sum, value) => sum + parseNumber(value), 0);
}

function formatSignedInteger(value) {
  const number = Number(value) || 0;
  if (number === 0) return "0";
  return `${number > 0 ? "+" : "-"}${fmtNumber.format(Math.abs(number))}`;
}

async function loadKpiSummary() {
  if (!els.summaryKpiPanel) return;
  els.summaryKpiPanel.innerHTML = `<div class="summary-empty">Memuat analisis KPI NIK invalid...</div>`;
  try {
    const response = await fetch(kpiSheetCsvUrl(), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = parseCsv(await response.text());
    const columns = mapKpiColumns(rows);
    const missing = Object.entries(columns).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) throw new Error(`Kolom belum lengkap: ${missing.join(", ")}`);
    const analysis = buildKpiSummaryAnalysis(rows, columns);
    renderKpiSummary(analysis);
  } catch (error) {
    els.summaryKpiSubtitle.textContent = "Sheet KPI belum bisa dibaca.";
    els.summaryKpiPanel.innerHTML = `
      <div class="summary-empty">Gagal memuat KPI NIK invalid: ${escapeHtml(error.message)}.</div>
    `;
  }
}

function buildKpiSummaryAnalysis(rows, columns) {
  const dates = [...new Set(rows.map((row) => String(kpiRead(row, columns, "date")).trim()).filter(Boolean))]
    .sort((a, b) => parseDate(a) - parseDate(b));
  const latestDate = dates.at(-1) ?? "";
  const latestMonth = monthKey(latestDate);
  const monthDates = dates.filter((date) => monthKey(date) === latestMonth);
  const firstDate = monthDates[0] ?? latestDate;
  const monthRows = rows.filter((row) => monthKey(kpiRead(row, columns, "date")) === latestMonth);
  const kanwilRows = rows
    .filter((row) => kpiCode(row, columns) === "905")
    .sort((a, b) => parseDate(kpiRead(a, columns, "date")) - parseDate(kpiRead(b, columns, "date")));
  const trendRows = kanwilRows.filter((row) => {
    const date = kpiRead(row, columns, "date");
    return monthKey(date) === latestMonth || dates.includes(date);
  });
  const currentMonthTrend = trendRows.filter((row) => monthKey(kpiRead(row, columns, "date")) === latestMonth);
  const priorMonthLatest = [];
  const byPriorMonth = new Map();
  for (const row of kanwilRows.filter((item) => monthKey(kpiRead(item, columns, "date")) !== latestMonth)) {
    const key = monthKey(kpiRead(row, columns, "date"));
    byPriorMonth.set(key, row);
  }
  for (const key of [...byPriorMonth.keys()].sort()) priorMonthLatest.push(byPriorMonth.get(key));
  const displayTrend = [...priorMonthLatest, ...currentMonthTrend];
  const startKanwil = kanwilRows.find((row) => kpiRead(row, columns, "date") === firstDate) ?? currentMonthTrend[0] ?? kanwilRows[0];
  const latestKanwil = kanwilRows.find((row) => kpiRead(row, columns, "date") === latestDate) ?? kanwilRows.at(-1);
  const officeMovements = buildKpiOfficeMovements(monthRows, columns);
  const kciMovements = officeMovements.filter((item) => item.officeClass === "Cabang");
  const kcpMovements = officeMovements.filter((item) => item.officeClass === "KCP");
  const bestScoreSort = (a, b) => b.latestPenalty - a.latestPenalty || a.latestBurden - b.latestBurden;
  const worstScoreSort = (a, b) => a.latestPenalty - b.latestPenalty || b.latestBurden - a.latestBurden;
  return {
    columns,
    latestDate,
    firstDate,
    latestMonth,
    workdays: countBusinessDays(firstDate, latestDate),
    startPenalty: kpiPenalty(startKanwil, columns),
    latestPenalty: kpiPenalty(latestKanwil, columns),
    startBurden: kpiInvalid(startKanwil, columns),
    latestBurden: kpiInvalid(latestKanwil, columns),
    latestNew: kpiNewInvalid(latestKanwil, columns),
    latestOld: kpiOldInvalid(latestKanwil, columns),
    trendRows: displayTrend,
    bestKci: kciMovements.sort(bestScoreSort).slice(0, 3),
    bestKcp: kcpMovements.sort(bestScoreSort).slice(0, 3),
    worstKci: kciMovements.sort(worstScoreSort).slice(0, 3),
    worstKcp: kcpMovements.sort(worstScoreSort).slice(0, 3),
  };
}

function buildKpiOfficeMovements(rows, columns) {
  const grouped = new Map();
  for (const row of rows) {
    const code = kpiCode(row, columns);
    if (!code || code === "905") continue;
    const current = grouped.get(code) ?? [];
    current.push(row);
    grouped.set(code, current);
  }
  return [...grouped.entries()].map(([code, officeRows]) => {
    const sorted = officeRows.sort((a, b) => parseDate(kpiRead(a, columns, "date")) - parseDate(kpiRead(b, columns, "date")));
    const first = sorted[0];
    const latest = sorted.at(-1);
    return {
      code,
      name: kpiName(latest, columns),
      officeClass: officeType(code),
      startPenalty: kpiPenalty(first, columns),
      latestPenalty: kpiPenalty(latest, columns),
      penaltyDelta: kpiPenalty(latest, columns) - kpiPenalty(first, columns),
      startBurden: kpiInvalid(first, columns),
      latestBurden: kpiInvalid(latest, columns),
      burdenDelta: kpiInvalid(latest, columns) - kpiInvalid(first, columns),
      latestNew: kpiNewInvalid(latest, columns),
      latestOld: kpiOldInvalid(latest, columns),
    };
  });
}

function renderKpiSummary(analysis) {
  const penaltyDelta = analysis.latestPenalty - analysis.startPenalty;
  const burdenDelta = analysis.latestBurden - analysis.startBurden;
  const movementTone = penaltyDelta > 0 ? "good" : penaltyDelta < 0 ? "bad" : "neutral";
  const movementText = penaltyDelta > 0 ? "membaik" : penaltyDelta < 0 ? "memburuk" : "stabil";
  const burdenText = burdenDelta < 0
    ? `beban turun ${fmtNumber.format(Math.abs(burdenDelta))}`
    : burdenDelta > 0
      ? `beban naik ${fmtNumber.format(burdenDelta)}`
      : "beban tidak berubah";
  const mainDriver = pickKpiDriver(analysis);
  els.summaryKpiSubtitle.textContent = `Update ${formatFullDate(analysis.firstDate)} s.d. ${formatFullDate(analysis.latestDate)}; semakin mendekati 0 semakin baik.`;
  els.summaryKpiPanel.innerHTML = `
    <div class="summary-kpi-grid">
      <section class="summary-kpi-trend">
        <div class="summary-kpi-metric">
          <span>Pengurang KPI Terakhir</span>
          <strong>${formatSigned(analysis.latestPenalty)}</strong>
          <em class="${movementTone}">${movementText} ${formatSigned(penaltyDelta)} poin</em>
        </div>
        ${renderMiniKpiTrend(analysis)}
      </section>
      <section class="summary-kpi-story">
        <h3>Analisis Pergerakan 1 Bulan Ini</h3>
        <p>
          Trend KPI NIK invalid Kanwil 905 <strong class="${movementTone}">${movementText}</strong>:
          dari <strong>${formatSigned(analysis.startPenalty)}</strong> menjadi
          <strong>${formatSigned(analysis.latestPenalty)}</strong> dalam ${fmtNumber.format(analysis.workdays)} hari kerja,
          karena ${burdenText}. Total beban terakhir <strong>${fmtNumber.format(analysis.latestBurden)}</strong>,
          terdiri dari TK baru <strong>${fmtNumber.format(analysis.latestNew)}</strong> dan TK lama
          <strong>${fmtNumber.format(analysis.latestOld)}</strong>.
        </p>
        <p>${renderKpiDriverSentence(mainDriver)}</p>
      </section>
    </div>
    <div class="summary-kpi-rank-grid">
      ${renderKpiRankCard("3 KCI Score Pengurang Terbaik", analysis.bestKci, "good")}
      ${renderKpiRankCard("3 KCP Score Pengurang Terbaik", analysis.bestKcp, "good")}
      ${renderKpiRankCard("3 KCI Score Pengurang Terjelek", analysis.worstKci, "bad")}
      ${renderKpiRankCard("3 KCP Score Pengurang Terjelek", analysis.worstKcp, "bad")}
    </div>
    <section class="summary-kpi-quickwin">
      <h3>Quick Win</h3>
      ${renderKpiQuickWin(analysis, mainDriver)}
    </section>
  `;
}

function pickKpiDriver(analysis) {
  const candidates = [...analysis.worstKci, ...analysis.worstKcp].sort((a, b) => b.burdenDelta - a.burdenDelta);
  if (candidates[0]?.burdenDelta > 0) return candidates[0];
  const improvements = [...analysis.bestKci, ...analysis.bestKcp].sort((a, b) => a.burdenDelta - b.burdenDelta);
  return improvements[0] ?? null;
}

function renderKpiDriverSentence(driver) {
  if (!driver) return "Belum cukup data pergerakan kantor untuk menentukan cabang pendorong utama.";
  const tone = driver.burdenDelta > 0 ? "bad" : "good";
  const direction = driver.burdenDelta > 0 ? "kenaikan" : "penurunan";
  return `${direction[0].toUpperCase()}${direction.slice(1)} terbesar ada di <strong class="${tone}">${escapeHtml(officeLabel(driver.code))}</strong>
    sebesar <strong class="${tone}">${formatSigned(driver.burdenDelta)}</strong> beban, sehingga kantor ini menjadi sinyal utama pergerakan KPI bulan ini.`;
}

function renderMiniKpiTrend(analysis) {
  const rows = analysis.trendRows;
  if (!rows.length) return `<div class="summary-empty">Trend belum tersedia.</div>`;
  const values = rows.map((row) => kpiPenalty(row, analysis.columns));
  const min = Math.min(...values, -1);
  const max = Math.max(...values, 0);
  const width = 620;
  const height = 180;
  const left = 38;
  const top = 20;
  const chartWidth = width - left - 16;
  const chartHeight = 108;
  const range = Math.max(0.01, max - min);
  const points = rows.map((row, index) => {
    const x = left + (rows.length === 1 ? chartWidth / 2 : index * chartWidth / (rows.length - 1));
    const y = top + ((max - kpiPenalty(row, analysis.columns)) / range) * chartHeight;
    return { x, y, row };
  });
  const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return `
    <svg class="summary-kpi-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Trend pengurang KPI NIK invalid">
      <line x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}" class="axis"></line>
      <line x1="${left}" y1="${top + chartHeight}" x2="${width - 12}" y2="${top + chartHeight}" class="axis"></line>
      <polyline points="${line}" class="summary-kpi-line"></polyline>
      ${points.map((point, index) => {
        const value = kpiPenalty(point.row, analysis.columns);
        const previous = index ? kpiPenalty(points[index - 1].row, analysis.columns) : null;
        const delta = previous === null ? null : value - previous;
        const labelClass = delta === null ? "neutral" : delta > 0 ? "good" : delta < 0 ? "bad" : "neutral";
        return `
          <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3"></circle>
          <text x="${point.x.toFixed(1)}" y="${Math.max(12, point.y - 8).toFixed(1)}" class="value-label ${labelClass}">${delta === null ? formatSigned(value) : formatSigned(delta)}</text>
          <text x="${point.x.toFixed(1)}" y="${top + chartHeight + 22}" class="date-label">${escapeHtml(formatKpiTrendDate(kpiRead(point.row, analysis.columns, "date"), analysis.latestMonth))}</text>
        `;
      }).join("")}
    </svg>
  `;
}

function renderKpiRankCard(title, items, tone) {
  const list = items.length
    ? items.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.code)}</strong></td>
        <td>${escapeHtml(item.name)}</td>
        <td class="num ${tone}">${formatSigned(item.latestPenalty)}</td>
        <td class="num">${fmtNumber.format(item.latestBurden)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="empty">Belum ada data score.</td></tr>`;
  return `
    <section class="summary-kpi-rank">
      <h3>${escapeHtml(title)}</h3>
      <table class="pivot-table compact-table">
        <thead><tr><th>Kode</th><th>Kantor</th><th class="num">Score Pengurang</th><th class="num">Beban</th></tr></thead>
        <tbody>${list}</tbody>
      </table>
    </section>
  `;
}

function renderKpiQuickWin(analysis, driver) {
  const worst = [...analysis.worstKci, ...analysis.worstKcp].sort((a, b) => b.latestBurden - a.latestBurden)[0];
  const priority = driver?.burdenDelta > 0 ? driver : worst;
  if (!priority) {
    return `<p>Belum ada beban prioritas. Pertahankan monitoring update berikutnya agar nilai tetap mendekati <strong>0</strong>.</p>`;
  }
  const dominantTk = priority.latestNew >= priority.latestOld ? "TK baru" : "TK lama";
  const dominantCount = Math.max(priority.latestNew, priority.latestOld);
  const secondTarget = worst && worst.code !== priority.code ? worst : null;
  return `
    <p><strong class="quickwin-focus">KERJAKAN DULU:</strong> ${escapeHtml(officeLabel(priority.code))}
      pada validitas NIK ${dominantTk}, karena masih ada <strong>${fmtNumber.format(dominantCount)}</strong>
      beban dominan dan nilai terakhir <strong>${formatSigned(priority.latestPenalty)}</strong>.</p>
    <p>Quick win paling cepat adalah bersihkan kantor dengan beban naik lebih dulu, lalu tutup sisa beban terbesar.
      ${secondTarget ? `Target lanjutan: ${escapeHtml(officeLabel(secondTarget.code))} dengan sisa beban ${fmtNumber.format(secondTarget.latestBurden)}.` : ""}
      Semakin banyak beban NIK invalid turun, pengurang KPI akan bergerak mendekati <strong>0</strong>.</p>
  `;
}

function renderDatasetSection(summary) {
  if (!summary.loaded) {
    return `
      <article class="panel summary-section">
        <div class="panel-head">
          <div>
            <h2>${escapeHtml(summary.title)}</h2>
            <p>Belum ada data temporary.</p>
          </div>
        </div>
        <div class="summary-empty">Upload data di menu ${escapeHtml(summary.storageLabel)} terlebih dahulu.</div>
      </article>
    `;
  }

  return `
    <article class="panel summary-section">
      <div class="panel-head">
        <div>
          <h2>${escapeHtml(summary.title)}</h2>
          <p>${escapeHtml(summary.fileName)} | ${fmtNumber.format(summary.problemRows)} ${escapeHtml(summary.rowLabel)} bermasalah | ${fmtNumber.format(summary.total)} temuan</p>
        </div>
      </div>
      <div class="summary-grid">
        <section>
          <h3>Proporsi dan Total Temuan per Elemen</h3>
          <div class="bars">${barList(summary.elementGroups, summary.total)}</div>
        </section>
        <section>
          <h3>5 Cabang Beban Tertinggi</h3>
          ${paretoTable(summary.topCabang, "Tidak ada data Cabang.")}
          <h3 class="summary-subtitle">5 KCP Beban Tertinggi</h3>
          ${paretoTable(summary.topKcp, "Tidak ada data KCP.")}
        </section>
        <section class="summary-insight">
          <h3>Insight Perbaikan</h3>
          <span>${insightList(summary)}</span>
        </section>
      </div>
    </article>
  `;
}

function renderOverall(summaries) {
  const loaded = summaries.filter((summary) => summary.loaded);
  els.summaryMeta.textContent = loaded.length
    ? `${loaded.length} dari ${datasets.length} dataset sudah tersedia.`
    : "Belum ada dataset tersimpan. Upload data di halaman profiling terlebih dahulu.";
}

async function loadSummary() {
  els.summarySections.innerHTML = `<article class="panel"><div class="summary-empty">Memuat summary...</div></article>`;
  loadKpiSummary();
  loadSummaryHeatmaps();
  const summaries = [];
  for (const config of datasets) {
    const data = await idbGet(config.key).catch(() => null);
    if (isStoredDataExpired(data)) {
      if (data) await idbDelete(config.key).catch(() => {});
      summaries.push(summarizeDataset(config, null));
      continue;
    }
    summaries.push(summarizeDataset(config, data));
  }
  renderOverall(summaries);
  els.summarySections.innerHTML = summaries.map(renderDatasetSection).join("");
}

els.refreshSummary.addEventListener("click", loadSummary);
els.downloadPdf.addEventListener("click", () => {
  window.print();
});
loadSummary();
