const profilerConfig = {
  storageKey: "pkbuProfiler.activeData.v1",
  subject: "PKBU",
  emptySourceText: "Upload data PKBU untuk mulai profiling.",
  combineContactCompleteness: false,
  lockedKanwil: "905",
  ...(window.PROFILER_CONFIG ?? {}),
};

const state = {
  rows: [],
  columns: [],
  mapping: {},
  kanwil: "905",
  cabang: "ALL",
  segment: "ALL",
  elemen: "ALL",
  extraColumn: "NONE",
  extraValue: "ALL",
  previewElement: "ALL",
  previewPage: 1,
  previewPageSize: 100,
  pembinaSearch: "",
  pembinaPage: 1,
  pembinaPageSize: 25,
  nppSearch: "",
  nppSegment: "ALL",
  nppViewMode: "PEMBINA",
  nppPage: 1,
  nppPageSize: 50,
  search: "",
  fileName: "",
  valueMode: "currency",
  sourceRowCount: 0,
  pkbuBurdenMode: profilerConfig.subject === "PKBU" && localStorage.getItem(`${profilerConfig.storageKey}.pkbuBurdenMode`) === "1",
};

const STORAGE_KEY = profilerConfig.storageKey;

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

const els = {
  fileInput: document.querySelector("#fileInput"),
  clearData: document.querySelector("#clearData"),
  downloadPdf: document.querySelector("#downloadPdf"),
  sourceNote: document.querySelector("#sourceNote"),
  uploadMeta: document.querySelector("#uploadMeta"),
  pkbuBurdenMode: document.querySelector("#pkbuBurdenMode"),
  kanwilFilter: document.querySelector("#kanwilFilter"),
  cabangFilter: document.querySelector("#cabangFilter"),
  segmentFilter: document.querySelector("#segmentFilter"),
  elemenFilter: document.querySelector("#elemenFilter"),
  extraColumnFilter: document.querySelector("#extraColumnFilter"),
  extraValueFilter: document.querySelector("#extraValueFilter"),
  resetFilters: document.querySelector("#resetFilters"),
  kpiTotal: document.querySelector("#kpiTotal"),
  kpiRows: document.querySelector("#kpiRows"),
  kpiTopCabang: document.querySelector("#kpiTopCabang"),
  kpiTopElemen: document.querySelector("#kpiTopElemen"),
  cabangSubtitle: document.querySelector("#cabangSubtitle"),
  elemenSubtitle: document.querySelector("#elemenSubtitle"),
  branchBars: document.querySelector("#branchBars"),
  elementBars: document.querySelector("#elementBars"),
  primaryQualityPanel: document.querySelector("#primaryQualityPanel"),
  pembinaPanel: document.querySelector("#pembinaPanel"),
  pembinaSubtitle: document.querySelector("#pembinaSubtitle"),
  pembinaSearchInput: document.querySelector("#pembinaSearchInput"),
  nppPivotPanel: document.querySelector("#nppPivotPanel"),
  nppPivotSubtitle: document.querySelector("#nppPivotSubtitle"),
  nppSegmentFilter: document.querySelector("#nppSegmentFilter"),
  nppViewModeFilter: document.querySelector("#nppViewModeFilter"),
  nppSearchInput: document.querySelector("#nppSearchInput"),
  downloadNppPivot: document.querySelector("#downloadNppPivot"),
  filteredInsights: document.querySelector("#filteredInsights"),
  filteredSubtitle: document.querySelector("#filteredSubtitle"),
  tableSubtitle: document.querySelector("#tableSubtitle"),
  downloadFiltered: document.querySelector("#downloadFiltered"),
  previewElementFilter: document.querySelector("#previewElementFilter"),
  previewHead: document.querySelector("#previewHead"),
  previewBody: document.querySelector("#previewBody"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  pageInfo: document.querySelector("#pageInfo"),
  searchInput: document.querySelector("#searchInput"),
  toast: document.querySelector("#toast"),
};

const fmtNumber = new Intl.NumberFormat("id-ID");
const fmtCurrency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const fmtPct = new Intl.NumberFormat("id-ID", {
  style: "percent",
  maximumFractionDigits: 1,
});

let printLockedControls = [];

const columnAliases = {
  kanwil: ["kanwil", "kode kanwil", "kd kanwil", "kode wilayah", "wilayah", "kacab induk"],
  cabang: ["cabang", "kantor cabang", "kode kantor", "kode kantor cabang", "nama cabang", "kacab", "unit kerja", "branch"],
  elemen: ["elemen", "element", "kategori", "jenis", "komponen", "keterangan elemen"],
  amount: [
    "sisa beban pkbu",
    "sisa beban",
    "beban pkbu",
    "nominal",
    "nilai",
    "saldo",
    "amount",
    "total",
  ],
};

const officeLookup = new Map([
  ["L00", { parent: "L00", name: "Semarang Pemuda" }],
  ["L01", { parent: "L01", name: "Surakarta" }],
  ["L02", { parent: "L02", name: "Cilacap" }],
  ["L03", { parent: "L03", name: "Yogyakarta" }],
  ["L04", { parent: "L04", name: "Pekalongan" }],
  ["L05", { parent: "L05", name: "Kudus" }],
  ["L06", { parent: "L06", name: "Magelang" }],
  ["L07", { parent: "L07", name: "Tegal" }],
  ["L08", { parent: "L08", name: "Klaten" }],
  ["L09", { parent: "L09", name: "Purwokerto" }],
  ["L10", { parent: "L10", name: "Ungaran" }],
  ["L11", { parent: "L11", name: "Semarang Majapahit" }],
  ["L12", { parent: "L01", name: "Sukoharjo Slamet Riyadi" }],
  ["L13", { parent: "L03", name: "Sleman Godean" }],
  ["L14", { parent: "L08", name: "Boyolali Randusari" }],
  ["L15", { parent: "L09", name: "Purbalingga Ahmad Yani" }],
  ["L16", { parent: "L03", name: "Bantul Ringin Harjo" }],
  ["L17", { parent: "L03", name: "Gunung Kidul Wonosari" }],
  ["L18", { parent: "L03", name: "Kulon Progo Wates" }],
  ["L19", { parent: "L05", name: "Jepara Wahid Hasyim" }],
  ["L20", { parent: "L05", name: "Pati Susanto" }],
  ["L21", { parent: "L11", name: "Grobogan Purwodadi" }],
  ["L22", { parent: "L01", name: "Karanganyar Triyagan" }],
  ["L23", { parent: "L04", name: "Pemalang Perintis Kemerdekaan" }],
  ["L24", { parent: "L01", name: "Sragen Sukowati" }],
  ["L25", { parent: "L02", name: "Kebumen Pemuda" }],
  ["L26", { parent: "L09", name: "Banjarnegara Pemuda" }],
  ["L27", { parent: "L05", name: "Blora Ahmad Yani" }],
  ["L28", { parent: "L04", name: "Batang Kauman" }],
  ["L29", { parent: "L06", name: "Temanggung Kertosari" }],
  ["L30", { parent: "L06", name: "Purworejo Tentara Pelajar" }],
  ["L31", { parent: "L06", name: "Wonosobo Muntang" }],
  ["L32", { parent: "L05", name: "Rembang Kartini" }],
  ["L33", { parent: "L07", name: "Brebes Ahmad Yani" }],
  ["L34", { parent: "L00", name: "Kendal Soekarno Hatta" }],
  ["905", { parent: "905", name: "Kanwil Jateng DIY" }],
]);

const normalizedIssueColumns = {
  kanwil: "Kanwil",
  cabang: "Cabang",
  elemen: "Elemen",
  amount: "Sisa Beban PKBU",
  status: "Status Kualitas",
  indication: "Indikasi Elemen",
  value: "Nilai Elemen",
  officeName: "Nama Kantor",
  category: "Kategori",
  segment: "Segmen",
  npp: "NPP",
  kodeTk: "Kode TK",
  kpj: "KPJ",
  nik: "NIK / Nomor Identitas",
  pembina: "Pembina",
  perusahaan: "Nama Perusahaan",
  tanggal: "Tanggal Proses",
};

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function officeLabel(code) {
  const key = String(code ?? "").trim();
  const office = officeLookup.get(key);
  return office ? `${key} - ${office.name}` : key;
}

function parseNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/^Rp/i, "")
    .replace(/\((.*)\)/, "-$1");

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    return Number(cleaned.replace(",", ".")) || 0;
  }
  if (/^-?\d{1,3}\.\d{3}$/.test(cleaned)) {
    return Number(cleaned.replace(".", "")) || 0;
  }
  if ((cleaned.match(/\./g) ?? []).length > 1) {
    return Number(cleaned.replace(/\./g, "")) || 0;
  }
  return Number(cleaned.replace(/[^0-9.-]/g, "")) || 0;
}

function formatMeasure(value) {
  if (state.valueMode === "count") return `${fmtNumber.format(value)} temuan`;
  return fmtCurrency.format(value);
}

function formatSavedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function countProblemNpp(rows) {
  if (state.valueMode !== "count") return rows.length;
  const idColumn = rows.some((row) => row[normalizedIssueColumns.kodeTk])
    ? normalizedIssueColumns.kodeTk
    : normalizedIssueColumns.npp;
  const unique = new Set(rows.map((row) => String(row[idColumn] ?? "").trim()).filter(Boolean));
  return unique.size || rows.length;
}

function parseDelimited(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = ["\t", "|", ";", ","]
    .map((candidate) => ({ candidate, count: firstLine.split(candidate).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.candidate ?? ",";
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift()?.map((header, index) => String(header || `Kolom ${index + 1}`).trim()) ?? [];
  const objects = rows
    .filter((items) => items.some((item) => String(item ?? "").trim()))
    .map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ""])));

  return { headers, rows: objects };
}

function findColumn(headers, key) {
  const normalized = new Map(headers.map((header) => [normalizeHeader(header), header]));
  for (const alias of columnAliases[key]) {
    if (normalized.has(alias)) return normalized.get(alias);
  }
  for (const header of headers) {
    const normalizedHeader = normalizeHeader(header);
    if (columnAliases[key].some((alias) => normalizedHeader.includes(alias))) return header;
  }
  return "";
}

function inferMapping(headers) {
  return {
    kanwil: findColumn(headers, "kanwil"),
    cabang: findColumn(headers, "cabang"),
    elemen: findColumn(headers, "elemen"),
    amount: findColumn(headers, "amount"),
  };
}

function isValidationColumn(header) {
  const normalized = normalizeHeader(header);
  return normalized.endsWith(" val") || normalized.endsWith(" prs val") || normalized.endsWith("pic val") || normalized.endsWith(" quality");
}

function qualityIssueColumns(headers) {
  return headers.filter(isValidationColumn);
}

const pkbuBurdenColumnLabels = new Map([
  ["JML_INFO_ALAMAT", "INFO ALAMAT"],
  ["JML_NAMA_HP_PIC", "NAMA HP PIC"],
  ["JML_NAMA_ALAMAT_PEMILIK", "NAMA ALAMAT PEMILIK"],
  ["JML_ASET_OMSET", "ASET OMSET"],
]);

function pkbuBurdenIssueColumns(headers) {
  if (profilerConfig.subject !== "PKBU" || !state.pkbuBurdenMode) return [];
  return [...pkbuBurdenColumnLabels.keys()].filter((column) => headers.includes(column));
}

function pkbuBurdenElementLabel(header) {
  return pkbuBurdenColumnLabels.get(header) ?? String(header).replace(/^JML_/i, "").replace(/_/g, " ");
}

function isBurdenFlag(value) {
  return parseNumber(value) === 1;
}

function qualityElementLabel(header) {
  return String(header)
    .replace(/_QUALITY$/i, "")
    .replace(/_PRS_VAL$/i, "")
    .replace(/_PIC_VAL$/i, "")
    .replace(/_VAL$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function qualityStatus(value) {
  return String(value ?? "").trim().toUpperCase();
}

function isAllowedKanwilValue(value) {
  return !profilerConfig.lockedKanwil || String(value ?? "").trim() === profilerConfig.lockedKanwil;
}

function isNoGoodStatus(status) {
  return Boolean(status) && status !== "GOOD";
}

function contactValidationPair(headers) {
  const validationColumns = qualityIssueColumns(headers);
  const emailColumn = validationColumns.find((header) => normalizeHeader(header).includes("email"));
  const phoneColumn = validationColumns.find((header) => {
    const normalized = normalizeHeader(header);
    return normalized.includes("handphone") || normalized === "hp quality" || normalized.includes(" hp ");
  });
  return emailColumn && phoneColumn ? { emailColumn, phoneColumn } : null;
}

function qualityValueColumn(headers, validationColumn) {
  const tkQualityMap = {
    NIK_QUALITY: "NOMOR_IDENTITAS",
    NAMA_QUALITY: "NAMA_LENGKAP",
    TGL_LAHIR_QUALITY: "TGL_LAHIR",
    IBU_QUALITY: "NAMA_IBU_KANDUNG",
    HP_QUALITY: "HANDPHONE",
    EMAIL_QUALITY: "EMAIL",
  };
  if (tkQualityMap[validationColumn] && headers.includes(tkQualityMap[validationColumn])) {
    return tkQualityMap[validationColumn];
  }

  const index = headers.indexOf(validationColumn);
  const previous = index > 0 ? headers[index - 1] : "";
  if (previous && !isValidationColumn(previous) && !normalizeHeader(previous).startsWith("jml ")) return previous;

  const base = validationColumn
    .replace(/_QUALITY$/i, "")
    .replace(/_PRS_VAL$/i, "")
    .replace(/_PIC_VAL$/i, "")
    .replace(/_VAL$/i, "");
  return headers.find((header) => normalizeHeader(header) === normalizeHeader(base)) ?? "";
}

function convertQualityRows(headers, rows) {
  const burdenColumns = pkbuBurdenIssueColumns(headers);
  const issueColumns = burdenColumns.length ? burdenColumns : qualityIssueColumns(headers);
  if (!issueColumns.length) return null;

  const kanwilCol = findColumn(headers, "kanwil") || "KODE_WILAYAH";
  const cabangCol = findColumn(headers, "cabang") || "KODE_KANTOR";
  const contactPair = profilerConfig.combineContactCompleteness ? contactValidationPair(headers) : null;
  const converted = [];

  for (const row of rows) {
    if (!isAllowedKanwilValue(row[kanwilCol])) continue;

    if (burdenColumns.length) {
      for (const column of burdenColumns) {
        if (!isBurdenFlag(row[column])) continue;
        const elementLabel = pkbuBurdenElementLabel(column);
        converted.push({
          [normalizedIssueColumns.kanwil]: row[kanwilCol] ?? "",
          [normalizedIssueColumns.cabang]: row[cabangCol] ?? "",
          [normalizedIssueColumns.officeName]: officeLookup.get(String(row[cabangCol] ?? "").trim())?.name ?? "",
          [normalizedIssueColumns.category]: row.KATEGORI ?? "",
          [normalizedIssueColumns.segment]: row.KODE_SEGMEN ?? "",
          [normalizedIssueColumns.elemen]: elementLabel,
          [normalizedIssueColumns.amount]: 1,
          [normalizedIssueColumns.status]: "BEBAN",
          [normalizedIssueColumns.indication]: `${elementLabel} - ${column}=1`,
          [normalizedIssueColumns.value]: row[column] ?? "",
          [normalizedIssueColumns.npp]: row.NPP ?? "",
          [normalizedIssueColumns.kodeTk]: row.KODE_TK ?? "",
          [normalizedIssueColumns.kpj]: row.KPJ ?? "",
          [normalizedIssueColumns.nik]: row.NOMOR_IDENTITAS ?? row.NIK ?? "",
          [normalizedIssueColumns.pembina]: row.PEMBINA ?? row.NAMA_PEMBINA ?? row.KODE_PEMBINA ?? "",
          [normalizedIssueColumns.perusahaan]: row.NAMA_PERUSAHAAN ?? row.NAMA_LENGKAP ?? "",
          [normalizedIssueColumns.tanggal]: row.TGL_PROSES ?? "",
        });
      }
      continue;
    }

    if (contactPair) {
      const emailStatus = qualityStatus(row[contactPair.emailColumn]);
      const phoneStatus = qualityStatus(row[contactPair.phoneColumn]);
      if (isNoGoodStatus(emailStatus) && isNoGoodStatus(phoneStatus)) {
        const emailValueColumn = qualityValueColumn(headers, contactPair.emailColumn);
        const phoneValueColumn = qualityValueColumn(headers, contactPair.phoneColumn);
        converted.push({
          [normalizedIssueColumns.kanwil]: row[kanwilCol] ?? "",
          [normalizedIssueColumns.cabang]: row[cabangCol] ?? "",
          [normalizedIssueColumns.officeName]: officeLookup.get(String(row[cabangCol] ?? "").trim())?.name ?? "",
          [normalizedIssueColumns.category]: row.KATEGORI ?? "",
          [normalizedIssueColumns.segment]: row.KODE_SEGMEN ?? "",
          [normalizedIssueColumns.elemen]: "EMAIL / HANDPHONE",
          [normalizedIssueColumns.amount]: 1,
          [normalizedIssueColumns.status]: `${emailStatus} & ${phoneStatus}`,
          [normalizedIssueColumns.indication]: `EMAIL / HANDPHONE - ${emailStatus} & ${phoneStatus}`,
          [normalizedIssueColumns.value]: [
            emailValueColumn ? `Email: ${row[emailValueColumn] ?? ""}` : "",
            phoneValueColumn ? `HP: ${row[phoneValueColumn] ?? ""}` : "",
          ].filter(Boolean).join(" | "),
          [normalizedIssueColumns.npp]: row.NPP ?? "",
          [normalizedIssueColumns.kodeTk]: row.KODE_TK ?? "",
          [normalizedIssueColumns.kpj]: row.KPJ ?? "",
          [normalizedIssueColumns.nik]: row.NOMOR_IDENTITAS ?? row.NIK ?? "",
          [normalizedIssueColumns.pembina]: row.PEMBINA ?? row.NAMA_PEMBINA ?? row.KODE_PEMBINA ?? "",
          [normalizedIssueColumns.perusahaan]: row.NAMA_PERUSAHAAN ?? row.NAMA_LENGKAP ?? "",
          [normalizedIssueColumns.tanggal]: row.TGL_PROSES ?? "",
        });
      }
    }

    for (const column of issueColumns) {
      if (contactPair && (column === contactPair.emailColumn || column === contactPair.phoneColumn)) continue;
      const status = qualityStatus(row[column]);
      if (!isNoGoodStatus(status)) continue;
      const elementLabel = qualityElementLabel(column);
      const valueColumn = qualityValueColumn(headers, column);
      converted.push({
        [normalizedIssueColumns.kanwil]: row[kanwilCol] ?? "",
        [normalizedIssueColumns.cabang]: row[cabangCol] ?? "",
        [normalizedIssueColumns.officeName]: officeLookup.get(String(row[cabangCol] ?? "").trim())?.name ?? "",
        [normalizedIssueColumns.category]: row.KATEGORI ?? "",
        [normalizedIssueColumns.segment]: row.KODE_SEGMEN ?? "",
        [normalizedIssueColumns.elemen]: elementLabel,
        [normalizedIssueColumns.amount]: 1,
        [normalizedIssueColumns.status]: status,
        [normalizedIssueColumns.indication]: `${elementLabel} - ${status}`,
        [normalizedIssueColumns.value]: valueColumn ? row[valueColumn] ?? "" : "",
        [normalizedIssueColumns.npp]: row.NPP ?? "",
        [normalizedIssueColumns.kodeTk]: row.KODE_TK ?? "",
        [normalizedIssueColumns.kpj]: row.KPJ ?? "",
        [normalizedIssueColumns.nik]: row.NOMOR_IDENTITAS ?? row.NIK ?? "",
        [normalizedIssueColumns.pembina]: row.PEMBINA ?? row.NAMA_PEMBINA ?? row.KODE_PEMBINA ?? "",
        [normalizedIssueColumns.perusahaan]: row.NAMA_PERUSAHAAN ?? row.NAMA_LENGKAP ?? "",
        [normalizedIssueColumns.tanggal]: row.TGL_PROSES ?? "",
      });
    }
  }

  return {
    headers: Object.values(normalizedIssueColumns),
    rows: converted,
    mapping: {
      kanwil: normalizedIssueColumns.kanwil,
      cabang: normalizedIssueColumns.cabang,
      elemen: normalizedIssueColumns.elemen,
      amount: normalizedIssueColumns.amount,
    },
    sourceRows: rows.filter((row) => isAllowedKanwilValue(row[kanwilCol])).length,
    issueColumns: issueColumns.length,
    issueMode: burdenColumns.length ? "kolom beban PKBU JML_*" : "elemen validasi",
  };
}

function uniqueValues(rows, column) {
  if (!column) return [];
  return [...new Set(rows.map((row) => String(row[column] ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
}

function setOptions(select, options, selectedValue) {
  select.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
    .join("");
}

function groupBySum(rows, column) {
  const groups = new Map();
  for (const row of rows) {
    const name = String(row[column] ?? "Kosong").trim() || "Kosong";
    const current = groups.get(name) ?? { name, total: 0, rows: 0 };
    current.total += parseNumber(row[state.mapping.amount]);
    current.rows += 1;
    groups.set(name, current);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

function sumAmount(rows) {
  return rows.reduce((sum, row) => sum + parseNumber(row[state.mapping.amount]), 0);
}

function baselineRows905() {
  const kanwilCol = state.mapping.kanwil;
  if (!kanwilCol) return state.rows;
  return state.rows.filter((row) => String(row[kanwilCol] ?? "").trim() === "905");
}

function filteredRows() {
  const { kanwil, cabang, segment, elemen, extraColumn, extraValue } = state;
  const { kanwil: kanwilCol, cabang: cabangCol, elemen: elemenCol } = state.mapping;
  return state.rows.filter((row) => {
    if (kanwilCol && kanwil !== "ALL" && String(row[kanwilCol] ?? "").trim() !== kanwil) return false;
    if (cabangCol && cabang !== "ALL" && String(row[cabangCol] ?? "").trim() !== cabang) return false;
    if (els.segmentFilter && segment !== "ALL" && String(row[normalizedIssueColumns.segment] ?? "").trim() !== segment) return false;
    if (elemenCol && elemen !== "ALL" && String(row[elemenCol] ?? "").trim() !== elemen) return false;
    if (extraColumn !== "NONE" && extraValue !== "ALL" && String(row[extraColumn] ?? "").trim() !== extraValue) return false;
    if (state.search) {
      const haystack = state.columns.map((column) => row[column]).join(" ").toLowerCase();
      if (!haystack.includes(state.search)) return false;
    }
    return true;
  });
}

function topShare(groups, total, options = {}) {
  const top = groups[0];
  if (!top || total <= 0) return "Belum ada data pembanding.";
  const label = options?.labelFn ? options.labelFn(top.name) : top.name;
  return `${label} memiliki ${formatMeasure(top.total)} atau ${fmtPct.format(top.total / total)} dari total.`;
}

function renderBars(container, groups, total, limit = 10, options = {}) {
  if (!groups.length) {
    container.innerHTML = `<p class="empty">Tidak ada data untuk filter ini.</p>`;
    return;
  }
  const max = Math.max(...groups.map((item) => Math.abs(item.total)), 1);
  container.innerHTML = groups.slice(0, limit).map((item) => {
    const share = total > 0 ? item.total / total : 0;
    const width = Math.max(1, Math.abs(item.total) / max * 100);
    const details = branchElementDetails(item, options);
    return `
      <div class="bar-row">
        <div class="bar-meta">
          <span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <em>${fmtPct.format(share)}</em>
          <strong>${formatMeasure(item.total)}</strong>
        </div>
        <div class="bar-track"><i style="--bar:${width.toFixed(2)}%"></i></div>
        ${details}
      </div>
    `;
  }).join("");
}

function branchElementDetails(item, options) {
  if (!options.detailRows || !options.groupColumn || !options.detailColumn) return "";
  const rows = options.detailRows.filter((row) => String(row[options.groupColumn] ?? "Kosong").trim() === item.name);
  const allDetails = groupBySum(rows, options.detailColumn);
  const details = allDetails.slice(0, options.detailLimit ?? 8);
  if (!details.length) return "";
  const detailTotal = details.reduce((sum, detail) => sum + detail.total, 0);
  return `
    <div class="bar-details" aria-label="Rincian elemen ${escapeHtml(item.name)}">
      ${details.map((detail) => `
        <span>
          <b>${escapeHtml(detail.name)}</b>
          <em>${formatMeasure(detail.total)}</em>
        </span>
      `).join("")}
      ${allDetails.length > details.length && detailTotal < item.total ? `<small>Elemen lain: ${formatMeasure(item.total - detailTotal)}</small>` : ""}
    </div>
  `;
}

function renderBranchPivotTable(container, rows, branchGroups, elementGroups) {
  if (!rows.length || !branchGroups.length || !elementGroups.length) {
    container.innerHTML = `<p class="empty">Tidak ada data untuk filter ini.</p>`;
    return;
  }

  const branchColumn = state.mapping.cabang;
  const elementColumn = state.mapping.elemen;
  const elements = elementGroups.map((item) => item.name);
  const matrix = new Map();

  for (const row of rows) {
    const branch = String(row[branchColumn] ?? "Kosong").trim() || "Kosong";
    const element = String(row[elementColumn] ?? "Kosong").trim() || "Kosong";
    if (!matrix.has(branch)) matrix.set(branch, new Map());
    const counts = matrix.get(branch);
    counts.set(element, (counts.get(element) ?? 0) + parseNumber(row[state.mapping.amount]));
  }

  container.innerHTML = `
    <div class="table-wrap pivot-wrap">
      <table class="pivot-table">
        <thead>
          <tr>
            <th>Kode Kantor</th>
            <th>Nama Kantor</th>
            <th class="num">Total</th>
            ${elements.map((element) => `<th class="num">${escapeHtml(element)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${branchGroups.map((branch) => {
            const counts = matrix.get(branch.name) ?? new Map();
            return `
              <tr>
                <td><strong>${escapeHtml(branch.name)}</strong></td>
                <td>${escapeHtml(officeLookup.get(branch.name)?.name ?? "-")}</td>
                <td class="num"><strong>${fmtNumber.format(branch.total)}</strong></td>
                ${elements.map((element) => {
                  const count = counts.get(element) ?? 0;
                  return `<td class="num">${count ? fmtNumber.format(count) : "-"}</td>`;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function insightItems(rows, scopeLabel) {
  const total = sumAmount(rows);
  const branchGroups = state.mapping.cabang ? groupBySum(rows, state.mapping.cabang) : [];
  const elementGroups = state.mapping.elemen ? groupBySum(rows, state.mapping.elemen) : [];
  const topBranch = branchGroups[0];
  const topElement = elementGroups[0];
  const topBranchDetails = topBranchesWithElements(rows, branchGroups, 3);
  const concentration = topBranchDetails.reduce((sum, item) => sum + item.total, 0);

  return [
    {
      title: "TOP 3 Temuan NOT GOOD",
      body: topListText(elementGroups.slice(0, 3)),
    },
    {
      title: "Cabang prioritas",
      body: topBranch
        ? `${officeLabel(topBranch.name)} adalah cabang terbanyak dengan ${formatMeasure(topBranch.total)} atau ${fmtPct.format(total ? topBranch.total / total : 0)} dari total.`
        : "Kolom cabang belum terdeteksi.",
    },
    {
      title: "Elemen dominan",
      body: topElement
        ? `${topElement.name} adalah elemen NOT GOOD terbanyak dengan ${formatMeasure(topElement.total)} atau ${fmtPct.format(total ? topElement.total / total : 0)} dari total.`
        : "Kolom elemen belum terdeteksi.",
    },
    {
      title: "Top 3 Cabang dan Elemen Terbesar",
      body: topBranchDetails.length
        ? `${topBranchDetails.map((item) => `${officeLabel(item.name)}: ${item.topElement} (${formatMeasure(item.topElementTotal)})`).join("\n")}\nTotal top ${topBranchDetails.length} cabang = ${fmtPct.format(total ? concentration / total : 0)} dari seluruh NOT GOOD.`
        : "Konsentrasi cabang belum bisa dihitung.",
    },
  ];
}

function topListText(items) {
  if (!items.length) return "Belum ada data elemen.";
  return items.map((item) => `${item.name}: ${formatMeasure(item.total)}`).join("\n");
}

function topBranchesWithElements(rows, branchGroups, limit) {
  if (!state.mapping.cabang || !state.mapping.elemen) return [];
  return branchGroups.slice(0, limit).map((branch) => {
    const branchRows = rows.filter((row) => String(row[state.mapping.cabang] ?? "").trim() === branch.name);
    const topElement = groupBySum(branchRows, state.mapping.elemen)[0];
    return {
      ...branch,
      topElement: topElement?.name ?? "-",
      topElementTotal: topElement?.total ?? 0,
    };
  });
}

function renderInsights(container, rows, scopeLabel) {
  container.innerHTML = insightItems(rows, scopeLabel).map((item) => `
    <div class="insight-item">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${formatInsightBody(item.body)}</span>
    </div>
  `).join("");
}

function formatInsightBody(body) {
  return escapeHtml(body)
    .split("\n")
    .filter(Boolean)
    .map((line) => `<i>${line}</i>`)
    .join("");
}

function renderFilters() {
  const kanwils = uniqueValues(state.rows, state.mapping.kanwil);
  const cabangs = uniqueValues(state.rows, state.mapping.cabang);
  const segments = uniqueValues(state.rows, normalizedIssueColumns.segment);
  const elemens = uniqueValues(state.rows, state.mapping.elemen);
  const categoricalColumns = state.columns.filter((column) => column !== state.mapping.amount);

  if (profilerConfig.lockedKanwil) {
    state.kanwil = profilerConfig.lockedKanwil;
  } else if (state.mapping.kanwil && !kanwils.includes(state.kanwil)) {
    state.kanwil = kanwils.includes("905") ? "905" : "ALL";
  }
  if (state.mapping.cabang && !cabangs.includes(state.cabang)) state.cabang = "ALL";
  if (els.segmentFilter && !segments.includes(state.segment)) state.segment = "ALL";
  if (state.mapping.elemen && !elemens.includes(state.elemen)) state.elemen = "ALL";
  if (!categoricalColumns.includes(state.extraColumn)) state.extraColumn = "NONE";

  setOptions(
    els.kanwilFilter,
    profilerConfig.lockedKanwil
      ? [{ value: profilerConfig.lockedKanwil, label: `${profilerConfig.lockedKanwil} - Kanwil Jateng DIY` }]
      : [{ value: "ALL", label: "Semua" }, ...kanwils.map((value) => ({ value, label: value }))],
    state.kanwil,
  );
  els.kanwilFilter.disabled = Boolean(profilerConfig.lockedKanwil);
  setOptions(els.cabangFilter, [{ value: "ALL", label: "Semua Cabang" }, ...cabangs.map((value) => ({ value, label: officeLabel(value) }))], state.cabang);
  if (els.segmentFilter) {
    setOptions(els.segmentFilter, [{ value: "ALL", label: "Semua Segmen" }, ...segments.map((value) => ({ value, label: value }))], state.segment);
  }
  setOptions(els.elemenFilter, [{ value: "ALL", label: "Semua Elemen" }, ...elemens.map((value) => ({ value, label: value }))], state.elemen);
  setOptions(
    els.extraColumnFilter,
    [{ value: "NONE", label: "Tidak ada" }, ...categoricalColumns.map((value) => ({ value, label: value }))],
    state.extraColumn,
  );

  const extraValues = state.extraColumn === "NONE" ? [] : uniqueValues(state.rows, state.extraColumn);
  if (!extraValues.includes(state.extraValue)) state.extraValue = "ALL";
  setOptions(els.extraValueFilter, [{ value: "ALL", label: "Semua Nilai" }, ...extraValues.map((value) => ({ value, label: value }))], state.extraValue);
  els.extraValueFilter.disabled = state.extraColumn === "NONE";
}

function renderPreview(rows) {
  const elementValues = uniqueValues(rows, state.mapping.elemen);
  if (!elementValues.includes(state.previewElement)) state.previewElement = "ALL";
  setOptions(
    els.previewElementFilter,
    [{ value: "ALL", label: "Semua Elemen Preview" }, ...elementValues.map((value) => ({ value, label: value }))],
    state.previewElement,
  );

  const previewRows = state.previewElement === "ALL"
    ? rows
    : rows.filter((row) => String(row[state.mapping.elemen] ?? "").trim() === state.previewElement);
  const preferredColumns = state.valueMode === "count"
    ? [
        normalizedIssueColumns.cabang,
        normalizedIssueColumns.officeName,
        normalizedIssueColumns.segment,
        normalizedIssueColumns.category,
        normalizedIssueColumns.npp,
        normalizedIssueColumns.kodeTk,
        normalizedIssueColumns.kpj,
        normalizedIssueColumns.nik,
        normalizedIssueColumns.perusahaan,
        normalizedIssueColumns.value,
        normalizedIssueColumns.elemen,
        normalizedIssueColumns.status,
        normalizedIssueColumns.pembina,
      ]
    : state.columns.slice(0, 12);
  const columns = preferredColumns.filter((column) => state.columns.includes(column));
  const totalPages = Math.max(1, Math.ceil(previewRows.length / state.previewPageSize));
  if (state.previewPage > totalPages) state.previewPage = totalPages;
  if (state.previewPage < 1) state.previewPage = 1;
  const start = (state.previewPage - 1) * state.previewPageSize;
  const pageRows = previewRows.slice(start, start + state.previewPageSize);
  els.previewHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>`;
  els.previewBody.innerHTML = pageRows.map((row) => `
    <tr>${columns.map((column) => {
      const isAmount = column === state.mapping.amount;
      const value = isAmount ? formatMeasure(parseNumber(row[column])) : row[column];
      return `<td class="${isAmount ? "num" : ""}" title="${escapeHtml(value)}">${escapeHtml(value)}</td>`;
    }).join("")}</tr>
  `).join("");
  els.tableSubtitle.textContent = `${fmtNumber.format(previewRows.length)} baris preview cocok; menampilkan ${fmtNumber.format(pageRows.length)} baris pada halaman ini.`;
  if (els.pageInfo) {
    const firstRow = previewRows.length ? start + 1 : 0;
    const lastRow = Math.min(start + pageRows.length, previewRows.length);
    els.pageInfo.textContent = `Halaman ${fmtNumber.format(state.previewPage)} / ${fmtNumber.format(totalPages)} (${fmtNumber.format(firstRow)}-${fmtNumber.format(lastRow)} dari ${fmtNumber.format(previewRows.length)})`;
  }
  if (els.prevPage) els.prevPage.disabled = state.previewPage <= 1;
  if (els.nextPage) els.nextPage.disabled = state.previewPage >= totalPages;
  if (els.downloadFiltered) els.downloadFiltered.disabled = !previewRows.length;
}

function previewColumns() {
  const preferredColumns = state.valueMode === "count"
    ? [
        normalizedIssueColumns.cabang,
        normalizedIssueColumns.officeName,
        normalizedIssueColumns.segment,
        normalizedIssueColumns.category,
        normalizedIssueColumns.npp,
        normalizedIssueColumns.kodeTk,
        normalizedIssueColumns.kpj,
        normalizedIssueColumns.nik,
        normalizedIssueColumns.perusahaan,
        normalizedIssueColumns.value,
        normalizedIssueColumns.elemen,
        normalizedIssueColumns.status,
        normalizedIssueColumns.pembina,
      ]
    : state.columns.slice(0, 12);
  return preferredColumns.filter((column) => state.columns.includes(column));
}

function previewFilteredRows() {
  const rows = filteredRows();
  return state.previewElement === "ALL"
    ? rows
    : rows.filter((row) => String(row[state.mapping.elemen] ?? "").trim() === state.previewElement);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadFilteredCsv() {
  const rows = previewFilteredRows();
  if (!rows.length) {
    showToast("Tidak ada data untuk didownload.");
    return;
  }
  const columns = previewColumns();
  const csv = [
    columns.map(csvEscape).join(","),
    ...rows.map((row) => columns.map((column) => {
      const isAmount = column === state.mapping.amount;
      return csvEscape(isAmount ? parseNumber(row[column]) : row[column]);
    }).join(",")),
  ].join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const branch = state.cabang === "ALL" ? "semua-cabang" : state.cabang.toLowerCase();
  const subject = profilerConfig.subject.toLowerCase().replace(/\s+/g, "-");
  anchor.href = url;
  anchor.download = `${subject}-${branch}-preview.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildNppPivotData(rows) {
  const branchColumn = state.mapping.cabang;
  const elementColumn = state.mapping.elemen;
  const amountColumn = state.mapping.amount;
  const nppColumn = normalizedIssueColumns.npp;
  const segmentColumn = normalizedIssueColumns.segment;
  const pembinaColumn = normalizedIssueColumns.pembina;

  if (!branchColumn || !elementColumn || !nppColumn || !rows.length) {
    return { elementNames: [], items: [] };
  }

  const elementGroups = groupBySum(rows, elementColumn);
  const elementNames = elementGroups.map((item) => item.name);
  const groups = new Map();

  for (const row of rows) {
    const branch = String(row[branchColumn] ?? "").trim() || "-";
    const segment = String(row[segmentColumn] ?? "").trim() || "-";
    const npp = String(row[nppColumn] ?? "").trim() || "-";
    const pembina = String(row[pembinaColumn] ?? "").trim() || "-";
    const element = String(row[elementColumn] ?? "").trim() || "Kosong";
    const key = state.nppViewMode === "NPP"
      ? `${branch}|${segment}|${npp}|${pembina}`
      : `${branch}|${segment}|${pembina}`;
    const current = groups.get(key) ?? {
      branch,
      segment,
      npp: state.nppViewMode === "NPP" ? npp : "-",
      pembina,
      total: 0,
      elements: new Map(),
    };
    if (current.pembina === "-" && pembina !== "-") current.pembina = pembina;
    const amount = parseNumber(row[amountColumn]);
    current.total += amount;
    current.elements.set(element, (current.elements.get(element) ?? 0) + amount);
    groups.set(key, current);
  }

  const search = state.nppSearch;
  const items = [...groups.values()]
    .filter((item) => state.nppSegment === "ALL" || item.segment === state.nppSegment)
    .filter((item) => !search || `${item.npp} ${item.pembina}`.toLowerCase().includes(search))
    .sort((a, b) => b.total - a.total || a.branch.localeCompare(b.branch, "id", { numeric: true }) || a.npp.localeCompare(b.npp, "id", { numeric: true }));

  return { elementNames, items };
}

function downloadNppPivotCsv() {
  const { elementNames, items } = buildNppPivotData(filteredRows());
  if (!items.length) {
    showToast("Tidak ada data pivot NPP untuk didownload.");
    return;
  }

  const includeNpp = state.nppViewMode === "NPP";
  const columns = ["Kode Cabang", "Segmen", ...(includeNpp ? ["NPP"] : []), "Pembina", "Total", ...elementNames];
  const csv = [
    columns.map(csvEscape).join(","),
    ...items.map((item) => [
      item.branch,
      item.segment,
      ...(includeNpp ? [item.npp] : []),
      item.pembina,
      item.total,
      ...elementNames.map((element) => item.elements.get(element) ?? 0),
    ].map(csvEscape).join(",")),
  ].join("\r\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const branch = state.cabang === "ALL" ? "semua-cabang" : state.cabang.toLowerCase();
  const segment = state.segment === "ALL" ? "semua-segmen" : state.segment.toLowerCase();
  const mode = includeNpp ? "per-npp" : "per-pembina";
  const subject = profilerConfig.subject.toLowerCase().replace(/\s+/g, "-");
  anchor.href = url;
  anchor.download = `${subject}-${branch}-${segment}-pivot-${mode}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function lockFiltersForPrint() {
  printLockedControls = [...document.querySelectorAll(".toolbar select, .toolbar button, .panel-head select, .panel-head input, .panel-head button, .pagination button")]
    .map((control) => ({ control, disabled: control.disabled }));
  for (const { control } of printLockedControls) {
    control.disabled = true;
  }
  document.body.classList.add("printing-locked");
}

function unlockFiltersAfterPrint() {
  for (const { control, disabled } of printLockedControls) {
    control.disabled = disabled;
  }
  printLockedControls = [];
  document.body.classList.remove("printing-locked");
}

function downloadPdf() {
  lockFiltersForPrint();
  window.print();
}

function renderPrimaryQuality(rows) {
  if (!els.primaryQualityPanel) return;
  const elementColumn = state.mapping.elemen;
  const branchColumn = state.mapping.cabang;
  const statusColumn = normalizedIssueColumns.status;
  const primaryElements = new Set(["NIK", "NAMA", "TGL LAHIR"]);
  const primaryRows = rows.filter((row) => primaryElements.has(String(row[elementColumn] ?? "").trim().toUpperCase()));
  const total = sumAmount(primaryRows);

  if (!primaryRows.length) {
    els.primaryQualityPanel.innerHTML = `
      <h3>Data Primer Invalid</h3>
      <p class="empty">Tidak ada temuan NIK, Nama, atau Tgl Lahir untuk filter aktif.</p>
    `;
    return;
  }

  const branchGroups = groupBySum(primaryRows, branchColumn).slice(0, 10);
  els.primaryQualityPanel.innerHTML = `
    <h3>Data Primer Invalid</h3>
    <p>${fmtNumber.format(countProblemNpp(primaryRows))} data memiliki ${formatMeasure(total)} pada elemen NIK, Nama, dan Tgl Lahir.</p>
    <div class="table-wrap primary-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Kode Kantor</th>
            <th>Nama Kantor</th>
            <th class="num">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${branchGroups.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.name)}</strong></td>
              <td>${escapeHtml(officeLookup.get(item.name)?.name ?? "-")}</td>
              <td class="num">${fmtNumber.format(item.total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderNppPivotPanel(rows) {
  if (!els.nppPivotPanel) return;

  renderNppSegmentOptions(rows);
  if (els.nppViewModeFilter) els.nppViewModeFilter.value = state.nppViewMode;
  if (els.nppSearchInput) {
    els.nppSearchInput.placeholder = state.nppViewMode === "NPP" ? "Cari NPP / pembina..." : "Cari pembina...";
  }
  const { elementNames, items } = buildNppPivotData(rows);
  const includeNpp = state.nppViewMode === "NPP";
  const subjectLabel = includeNpp ? "NPP" : "pembina";

  if (!items.length && !state.nppSearch) {
    els.nppPivotPanel.innerHTML = `<p class="empty">Tidak ada data pivot untuk filter aktif.</p>`;
    if (els.nppPivotSubtitle) els.nppPivotSubtitle.textContent = `Beban elemen NOT GOOD per ${subjectLabel}.`;
    if (els.downloadNppPivot) els.downloadNppPivot.disabled = true;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / state.nppPageSize));
  if (state.nppPage > totalPages) state.nppPage = totalPages;
  if (state.nppPage < 1) state.nppPage = 1;

  const start = (state.nppPage - 1) * state.nppPageSize;
  const visible = items.slice(start, start + state.nppPageSize);
  const firstRow = items.length ? start + 1 : 0;
  const lastRow = Math.min(start + visible.length, items.length);

  if (els.nppPivotSubtitle) {
    els.nppPivotSubtitle.textContent = `${fmtNumber.format(items.length)} ${subjectLabel} cocok; menampilkan ${fmtNumber.format(firstRow)}-${fmtNumber.format(lastRow)} dari ${fmtNumber.format(items.length)} ${subjectLabel}.`;
  }

  if (!visible.length) {
    els.nppPivotPanel.innerHTML = `<p class="empty">Tidak ada data yang cocok dengan pencarian.</p>`;
    if (els.downloadNppPivot) els.downloadNppPivot.disabled = true;
    return;
  }

  if (els.downloadNppPivot) els.downloadNppPivot.disabled = false;

  els.nppPivotPanel.innerHTML = `
    <div class="table-wrap npp-pivot-wrap">
      <table class="npp-pivot-table">
        <thead>
          <tr>
            <th>Kode Cabang</th>
            <th>Segmen</th>
            ${includeNpp ? "<th>NPP</th>" : ""}
            <th>Pembina</th>
            <th class="num">Total</th>
            ${elementNames.map((element) => `<th class="num">${escapeHtml(element)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${visible.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.branch)}</strong></td>
              <td>${escapeHtml(item.segment)}</td>
              ${includeNpp ? `<td>${escapeHtml(item.npp)}</td>` : ""}
              <td>${escapeHtml(item.pembina)}</td>
              <td class="num"><strong>${fmtNumber.format(item.total)}</strong></td>
              ${elementNames.map((element) => {
                const value = item.elements.get(element) ?? 0;
                return `<td class="num">${value ? fmtNumber.format(value) : "-"}</td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="pagination compact-pagination">
      <button id="prevNppPage" type="button" ${state.nppPage <= 1 ? "disabled" : ""}>Sebelumnya</button>
      <span>Halaman ${fmtNumber.format(state.nppPage)} / ${fmtNumber.format(totalPages)}</span>
      <button id="nextNppPage" type="button" ${state.nppPage >= totalPages ? "disabled" : ""}>Berikutnya</button>
    </div>
  `;
  els.nppPivotPanel.querySelector("#prevNppPage")?.addEventListener("click", () => {
    state.nppPage -= 1;
    render();
  });
  els.nppPivotPanel.querySelector("#nextNppPage")?.addEventListener("click", () => {
    state.nppPage += 1;
    render();
  });
}

function renderNppSegmentOptions(rows) {
  if (!els.nppSegmentFilter) return;
  const segmentColumn = normalizedIssueColumns.segment;
  const segments = [...new Set(rows.map((row) => String(row[segmentColumn] ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
  if (state.nppSegment !== "ALL" && !segments.includes(state.nppSegment)) {
    state.nppSegment = "ALL";
  }
  setOptions(
    els.nppSegmentFilter,
    [{ value: "ALL", label: "Semua Segmen" }, ...segments.map((segment) => ({ value: segment, label: segment }))],
    state.nppSegment,
  );
}

function renderPembinaPanel(rows) {
  if (!els.pembinaPanel) return;
  if (profilerConfig.subject !== "PKBU") {
    els.pembinaPanel.closest(".panel").hidden = true;
    return;
  }

  els.pembinaPanel.closest(".panel").hidden = false;
  const pembinaColumn = normalizedIssueColumns.pembina;
  const branchColumn = state.mapping.cabang;
  const groups = new Map();

  for (const row of rows) {
    const pembina = String(row[pembinaColumn] ?? "").trim() || "Tanpa Pembina";
    const branch = String(row[branchColumn] ?? "").trim() || "-";
    const key = `${pembina}|${branch}`;
    const current = groups.get(key) ?? { pembina, branch, total: 0 };
    current.total += parseNumber(row[state.mapping.amount]);
    groups.set(key, current);
  }

  const items = [...groups.values()]
    .filter((item) => !state.pembinaSearch || `${item.pembina} ${item.branch}`.toLowerCase().includes(state.pembinaSearch))
    .sort((a, b) => b.total - a.total);
  const totalPages = Math.max(1, Math.ceil(items.length / state.pembinaPageSize));
  if (state.pembinaPage > totalPages) state.pembinaPage = totalPages;
  if (state.pembinaPage < 1) state.pembinaPage = 1;
  const start = (state.pembinaPage - 1) * state.pembinaPageSize;
  const visible = items.slice(start, start + state.pembinaPageSize);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  if (els.pembinaSubtitle) {
    els.pembinaSubtitle.textContent = `${fmtNumber.format(items.length)} pembina/kantor cocok; total ${formatMeasure(total)}.`;
  }

  if (!visible.length) {
    els.pembinaPanel.innerHTML = `<p class="empty">Tidak ada data pembina untuk filter aktif.</p>`;
    return;
  }

  els.pembinaPanel.innerHTML = `
    <div class="table-wrap pembina-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Pembina</th>
            <th>Kode Kantor</th>
            <th class="num">Total Temuan</th>
          </tr>
        </thead>
        <tbody>
          ${visible.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.pembina)}</strong></td>
              <td>${escapeHtml(item.branch)}</td>
              <td class="num">${fmtNumber.format(item.total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="pagination compact-pagination">
      <button id="prevPembinaPage" type="button" ${state.pembinaPage <= 1 ? "disabled" : ""}>Sebelumnya</button>
      <span>Halaman ${fmtNumber.format(state.pembinaPage)} / ${fmtNumber.format(totalPages)}</span>
      <button id="nextPembinaPage" type="button" ${state.pembinaPage >= totalPages ? "disabled" : ""}>Berikutnya</button>
    </div>
  `;
  els.pembinaPanel.querySelector("#prevPembinaPage")?.addEventListener("click", () => {
    state.pembinaPage -= 1;
    render();
  });
  els.pembinaPanel.querySelector("#nextPembinaPage")?.addEventListener("click", () => {
    state.pembinaPage += 1;
    render();
  });
}

function renderEmpty() {
  els.kpiTotal.textContent = "-";
  els.kpiRows.textContent = "-";
  els.kpiTopCabang.textContent = "-";
  els.kpiTopElemen.textContent = "-";
  els.branchBars.innerHTML = `<p class="empty">Upload file CSV, TSV, TXT, XLS, atau XLSX.</p>`;
  els.elementBars.innerHTML = `<p class="empty">Data baru akan mengganti data yang sedang tampil.</p>`;
  if (els.pembinaPanel) els.pembinaPanel.innerHTML = `<p class="empty">Belum ada data pembina.</p>`;
  if (els.pembinaSubtitle) els.pembinaSubtitle.textContent = "Pembina dengan total elemen PKBU invalid terbanyak.";
  if (els.nppPivotPanel) els.nppPivotPanel.innerHTML = `<p class="empty">Belum ada data NPP.</p>`;
  if (els.nppPivotSubtitle) els.nppPivotSubtitle.textContent = "Beban elemen NOT GOOD per pembina.";
  if (els.downloadNppPivot) els.downloadNppPivot.disabled = true;
  els.filteredInsights.innerHTML = `<p class="empty">Belum ada data.</p>`;
  els.previewHead.innerHTML = "";
  els.previewBody.innerHTML = "";
  if (els.pageInfo) els.pageInfo.textContent = "Halaman 1";
  if (els.prevPage) els.prevPage.disabled = true;
  if (els.nextPage) els.nextPage.disabled = true;
  if (els.downloadFiltered) els.downloadFiltered.disabled = true;
  renderUploadMeta();
  setOptions(els.previewElementFilter, [{ value: "ALL", label: "Semua Elemen Preview" }], "ALL");
  setOptions(els.kanwilFilter, [{ value: "905", label: "905 - Kanwil Jateng DIY" }], "905");
  els.kanwilFilter.disabled = true;
  setOptions(els.cabangFilter, [{ value: "ALL", label: "Semua Cabang" }], "ALL");
  if (els.segmentFilter) setOptions(els.segmentFilter, [{ value: "ALL", label: "Semua Segmen" }], "ALL");
  if (els.nppSegmentFilter) setOptions(els.nppSegmentFilter, [{ value: "ALL", label: "Semua Segmen" }], "ALL");
  if (els.nppViewModeFilter) els.nppViewModeFilter.value = "PEMBINA";
  setOptions(els.elemenFilter, [{ value: "ALL", label: "Semua Elemen" }], "ALL");
  setOptions(els.extraColumnFilter, [{ value: "NONE", label: "Tidak ada" }], "NONE");
  setOptions(els.extraValueFilter, [{ value: "ALL", label: "Semua Nilai" }], "ALL");
}

function render() {
  if (!state.rows.length) {
    renderEmpty();
    return;
  }

  renderFilters();
  const rows = filteredRows();
  const total = sumAmount(rows);
  const branchGroups = state.mapping.cabang ? groupBySum(rows, state.mapping.cabang) : [];
  const elementGroupsFiltered = state.mapping.elemen ? groupBySum(rows, state.mapping.elemen) : [];

  els.kpiTotal.textContent = formatMeasure(total);
  els.kpiRows.textContent = fmtNumber.format(countProblemNpp(rows));
  els.kpiTopCabang.textContent = branchGroups[0] ? officeLabel(branchGroups[0].name) : "-";
  els.kpiTopElemen.textContent = elementGroupsFiltered[0]?.name ?? "-";
  els.cabangSubtitle.textContent = topShare(branchGroups, total, { labelFn: officeLabel });
  els.elemenSubtitle.textContent = `${activeFilterLabel()}: ${topShare(elementGroupsFiltered, total)}`;
  els.filteredSubtitle.textContent = activeFilterLabel();

  renderBranchPivotTable(els.branchBars, rows, branchGroups, elementGroupsFiltered);
  renderBars(els.elementBars, elementGroupsFiltered, total, 18);
  renderPrimaryQuality(rows);
  renderNppPivotPanel(rows);
  renderPembinaPanel(rows);
  renderInsights(els.filteredInsights, rows, insightScopeLabel());
  renderPreview(rows);
}

function activeFilterLabel() {
  const parts = [];
  if (state.mapping.kanwil) parts.push(`Kanwil ${state.kanwil === "ALL" ? "semua" : state.kanwil}`);
  if (state.cabang !== "ALL") parts.push(`Cabang ${officeLabel(state.cabang)}`);
  if (state.segment !== "ALL") parts.push(`Segmen ${state.segment}`);
  if (state.elemen !== "ALL") parts.push(`Elemen ${state.elemen}`);
  if (state.extraColumn !== "NONE" && state.extraValue !== "ALL") parts.push(`${state.extraColumn}: ${state.extraValue}`);
  return parts.length ? parts.join(" | ") : "Semua data.";
}

function insightScopeLabel() {
  if (state.cabang !== "ALL") return `Cabang ${officeLabel(state.cabang)}`;
  if (state.segment !== "ALL") return `Segmen ${state.segment}`;
  if (state.elemen !== "ALL") return `Elemen ${state.elemen}`;
  if (state.extraColumn !== "NONE" && state.extraValue !== "ALL") return "filter aktif";
  return state.kanwil === "ALL" ? "semua Kanwil" : `Kanwil ${state.kanwil}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 4200);
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

async function idbSet(key, value) {
  const db = await openProfilerDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("datasets", "readwrite");
    tx.objectStore("datasets").put(value, key);
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

async function saveCurrentData() {
  if (!state.rows.length) return;
  try {
    const savedAt = new Date().toISOString();
    await idbSet(STORAGE_KEY, {
      rows: state.rows,
      columns: state.columns,
      mapping: state.mapping,
      fileName: state.fileName,
      valueMode: state.valueMode,
      sourceRowCount: state.sourceRowCount,
      savedAt,
      savedDateKey: localDateKey(savedAt),
    });
    renderUploadMeta(savedAt);
  } catch (error) {
    console.warn(`Gagal menyimpan data ${profilerConfig.subject} di browser.`, error);
    showToast("Data tampil, tapi tidak bisa disimpan otomatis di browser.");
  }
}

async function restoreSavedData() {
  try {
    const saved = await idbGet(STORAGE_KEY);
    if (!saved?.rows?.length || !saved?.columns?.length || !saved?.mapping) return false;
    if (isStoredDataExpired(saved)) {
      await idbDelete(STORAGE_KEY).catch(() => {});
      els.sourceNote.textContent = `${profilerConfig.subject} tersimpan sudah expired karena sudah berbeda hari. Upload data baru untuk mulai profiling.`;
      return false;
    }
    state.rows = saved.rows;
    state.columns = saved.columns;
    state.mapping = saved.mapping;
    state.fileName = saved.fileName ?? "data tersimpan";
    state.valueMode = saved.valueMode ?? "currency";
    state.sourceRowCount = saved.sourceRowCount ?? saved.rows.length;
    state.kanwil = profilerConfig.lockedKanwil ?? (state.mapping.kanwil && uniqueValues(state.rows, state.mapping.kanwil).includes("905") ? "905" : "ALL");
    state.cabang = "ALL";
    state.segment = "ALL";
    state.elemen = "ALL";
    state.extraColumn = "NONE";
    state.extraValue = "ALL";
    state.previewElement = "ALL";
    state.previewPage = 1;
    state.pembinaSearch = "";
    state.pembinaPage = 1;
    state.search = "";
    els.sourceNote.textContent = `${state.fileName}; data dipulihkan dari browser. Upload file baru untuk mengganti data ini.`;
    renderUploadMeta(saved.savedAt);
    return true;
  } catch (error) {
    console.warn(`Gagal memulihkan data ${profilerConfig.subject} tersimpan.`, error);
    await idbDelete(STORAGE_KEY).catch(() => {});
    return false;
  }
}

function renderUploadMeta(savedAt = null) {
  if (!els.uploadMeta) return;
  if (!state.rows.length) {
    els.uploadMeta.textContent = "Belum ada data tersimpan.";
    return;
  }
  const problemNpp = countProblemNpp(state.rows);
  const total = sumAmount(state.rows);
  const savedText = formatSavedAt(savedAt);
  els.uploadMeta.textContent = [
    `Data terakhir: ${state.fileName || "-"}`,
    `${fmtNumber.format(problemNpp)} NPP/perusahaan`,
    `${formatMeasure(total)}`,
    savedText ? `tersimpan ${savedText}` : "",
  ].filter(Boolean).join(" | ");
}

async function readWorkbook(file) {
  if (!window.XLSX) {
    throw new Error("Parser Excel belum tersedia. Simpan file sebagai CSV atau aktifkan akses CDN SheetJS.");
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  return {
    headers: rows.length ? Object.keys(rows[0]) : [],
    rows,
  };
}

async function readUploadedFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return readWorkbook(file);
  return parseDelimited(await file.text());
}

function validateLoadedData(headers, rows) {
  const mapping = inferMapping(headers);
  const missing = [];
  if (!mapping.cabang) missing.push("Cabang");
  if (!mapping.elemen) missing.push("Elemen");
  if (!mapping.amount) missing.push("Sisa Beban PKBU/Nominal");

  if (missing.length) {
    throw new Error(`Kolom wajib belum terdeteksi: ${missing.join(", ")}.`);
  }
  if (!rows.length) throw new Error("File tidak memiliki baris data.");
  return mapping;
}

async function handleFiles(files) {
  try {
    const loadedFiles = [];
    for (const file of files) {
      const loaded = await readUploadedFile(file);
      const qualityData = convertQualityRows(loaded.headers, loaded.rows);
      const headers = qualityData?.headers ?? loaded.headers;
      const rows = qualityData?.rows ?? loaded.rows;
      const mapping = qualityData?.mapping ?? validateLoadedData(headers, rows);
      loadedFiles.push({ file, headers, rows, mapping, qualityData });
    }

    const first = loadedFiles[0];
    const headers = first.headers;
    const mapping = first.mapping;
    let rows = loadedFiles.flatMap((item) => item.rows);
    const qualityData = loadedFiles.every((item) => item.qualityData)
      ? {
          sourceRows: loadedFiles.reduce((sum, item) => sum + item.qualityData.sourceRows, 0),
          issueColumns: Math.max(...loadedFiles.map((item) => item.qualityData.issueColumns)),
          issueMode: loadedFiles.find((item) => item.qualityData.issueMode)?.qualityData.issueMode ?? "elemen validasi",
        }
      : null;
    if (profilerConfig.lockedKanwil && mapping.kanwil) {
      rows = rows.filter((row) => isAllowedKanwilValue(row[mapping.kanwil]));
    }
    if (!rows.length) {
      throw new Error(`File tidak memiliki data Kanwil ${profilerConfig.lockedKanwil ?? "yang diizinkan"}.`);
    }
    state.rows = rows;
    state.columns = headers;
    state.mapping = mapping;
    state.fileName = loadedFiles.map((item) => item.file.name).join(" + ");
    state.valueMode = qualityData ? "count" : "currency";
    state.sourceRowCount = qualityData?.sourceRows ?? rows.length;
    state.kanwil = profilerConfig.lockedKanwil ?? (mapping.kanwil && uniqueValues(rows, mapping.kanwil).includes("905") ? "905" : "ALL");
    state.cabang = "ALL";
    state.segment = "ALL";
    state.elemen = "ALL";
    state.extraColumn = "NONE";
    state.extraValue = "ALL";
    state.previewElement = "ALL";
    state.search = "";
    state.nppSearch = "";
    state.nppSegment = "ALL";
    state.nppViewMode = "PEMBINA";
    state.nppPage = 1;
    els.searchInput.value = "";
    if (els.nppSearchInput) els.nppSearchInput.value = "";
    if (els.nppSegmentFilter) els.nppSegmentFilter.value = "ALL";
    if (els.nppViewModeFilter) els.nppViewModeFilter.value = "PEMBINA";
    els.sourceNote.textContent = qualityData
      ? `${state.fileName}; ${fmtNumber.format(qualityData.sourceRows)} baris sumber; ${fmtNumber.format(rows.length)} temuan kualitas dari ${fmtNumber.format(qualityData.issueColumns)} ${qualityData.issueMode}. Data lama sudah diganti.`
      : `${state.fileName}; ${fmtNumber.format(rows.length)} baris. Kolom nominal: ${mapping.amount}. Data lama sudah diganti.`;
    await saveCurrentData();
    render();
    showToast("Data baru berhasil dimuat dan mengganti data sebelumnya.");
  } catch (error) {
    showToast(error.message);
  }
}

function resetFilters() {
  state.kanwil = profilerConfig.lockedKanwil ?? (state.mapping.kanwil && uniqueValues(state.rows, state.mapping.kanwil).includes("905") ? "905" : "ALL");
  state.cabang = "ALL";
  state.segment = "ALL";
  state.elemen = "ALL";
  state.extraColumn = "NONE";
  state.extraValue = "ALL";
  state.previewElement = "ALL";
  state.previewPage = 1;
  state.pembinaSearch = "";
  state.pembinaPage = 1;
  state.nppSearch = "";
  state.nppSegment = "ALL";
  state.nppViewMode = "PEMBINA";
  state.nppPage = 1;
  state.search = "";
  els.searchInput.value = "";
  if (els.pembinaSearchInput) els.pembinaSearchInput.value = "";
  if (els.nppSearchInput) els.nppSearchInput.value = "";
  if (els.nppSegmentFilter) els.nppSegmentFilter.value = "ALL";
  if (els.nppViewModeFilter) els.nppViewModeFilter.value = "PEMBINA";
  render();
}

async function clearData() {
  state.rows = [];
  state.columns = [];
  state.mapping = {};
  state.segment = "ALL";
  state.fileName = "";
  state.valueMode = "currency";
  state.sourceRowCount = 0;
  state.search = "";
  state.previewElement = "ALL";
  state.previewPage = 1;
  state.pembinaSearch = "";
  state.pembinaPage = 1;
  state.nppSearch = "";
  state.nppSegment = "ALL";
  state.nppViewMode = "PEMBINA";
  state.nppPage = 1;
  els.fileInput.value = "";
  els.searchInput.value = "";
  if (els.pembinaSearchInput) els.pembinaSearchInput.value = "";
  if (els.nppSearchInput) els.nppSearchInput.value = "";
  if (els.nppSegmentFilter) els.nppSegmentFilter.value = "ALL";
  if (els.nppViewModeFilter) els.nppViewModeFilter.value = "PEMBINA";
  els.sourceNote.textContent = profilerConfig.emptySourceText;
  await idbDelete(STORAGE_KEY).catch(() => {});
  renderUploadMeta();
  render();
}

function bindEvents() {
  if (els.pkbuBurdenMode) {
    els.pkbuBurdenMode.checked = state.pkbuBurdenMode;
    els.pkbuBurdenMode.addEventListener("change", (event) => {
      state.pkbuBurdenMode = event.target.checked;
      localStorage.setItem(`${profilerConfig.storageKey}.pkbuBurdenMode`, state.pkbuBurdenMode ? "1" : "0");
      showToast(state.pkbuBurdenMode
        ? "Mode beban JML aktif. Upload ulang file PKBU untuk memakai hitungan 4 kolom JML."
        : "Mode beban JML nonaktif. Upload ulang file PKBU untuk kembali ke hitungan validasi.");
    });
  }

  els.fileInput.addEventListener("change", (event) => {
    const files = [...(event.target.files ?? [])];
    if (files.length) handleFiles(profilerConfig.allowMultipleFiles ? files : files.slice(0, 1));
  });
  els.clearData.addEventListener("click", () => {
    clearData();
  });
  els.downloadPdf?.addEventListener("click", downloadPdf);
  els.resetFilters.addEventListener("click", resetFilters);
  els.kanwilFilter.addEventListener("change", (event) => {
    state.kanwil = event.target.value;
    state.previewPage = 1;
    state.pembinaPage = 1;
    state.nppPage = 1;
    render();
  });
  els.cabangFilter.addEventListener("change", (event) => {
    state.cabang = event.target.value;
    state.previewPage = 1;
    state.pembinaPage = 1;
    state.nppPage = 1;
    render();
  });
  els.segmentFilter?.addEventListener("change", (event) => {
    state.segment = event.target.value;
    state.previewPage = 1;
    state.pembinaPage = 1;
    state.nppPage = 1;
    render();
  });
  els.elemenFilter.addEventListener("change", (event) => {
    state.elemen = event.target.value;
    state.previewPage = 1;
    state.pembinaPage = 1;
    state.nppPage = 1;
    render();
  });
  els.extraColumnFilter.addEventListener("change", (event) => {
    state.extraColumn = event.target.value;
    state.extraValue = "ALL";
    state.previewPage = 1;
    state.pembinaPage = 1;
    state.nppPage = 1;
    render();
  });
  els.extraValueFilter.addEventListener("change", (event) => {
    state.extraValue = event.target.value;
    state.previewPage = 1;
    state.pembinaPage = 1;
    state.nppPage = 1;
    render();
  });
  els.previewElementFilter.addEventListener("change", (event) => {
    state.previewElement = event.target.value;
    state.previewPage = 1;
    render();
  });
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    state.previewPage = 1;
    state.nppPage = 1;
    render();
  });
  els.prevPage?.addEventListener("click", () => {
    state.previewPage -= 1;
    render();
  });
  els.nextPage?.addEventListener("click", () => {
    state.previewPage += 1;
    render();
  });
  els.downloadFiltered?.addEventListener("click", downloadFilteredCsv);
  els.downloadNppPivot?.addEventListener("click", downloadNppPivotCsv);
  els.pembinaSearchInput?.addEventListener("input", (event) => {
    state.pembinaSearch = event.target.value.trim().toLowerCase();
    state.pembinaPage = 1;
    render();
  });
  els.nppSearchInput?.addEventListener("input", (event) => {
    state.nppSearch = event.target.value.trim().toLowerCase();
    state.nppPage = 1;
    render();
  });
  els.nppSegmentFilter?.addEventListener("change", (event) => {
    state.nppSegment = event.target.value;
    state.nppPage = 1;
    render();
  });
  els.nppViewModeFilter?.addEventListener("change", (event) => {
    state.nppViewMode = event.target.value;
    state.nppPage = 1;
    render();
  });
}

bindEvents();
window.addEventListener("afterprint", unlockFiltersAfterPrint);
restoreSavedData().then(() => render());
