const STORAGE_KEY = "tkPemadanan.activeData.v1";

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

const state = {
  rows: [],
  columns: [],
  fileName: "",
  branch: "ALL",
  segment: "ALL",
  tkBaru: "ALL",
  message: "ALL",
  search: "",
  page: 1,
  pageSize: 100,
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  clearData: document.querySelector("#clearData"),
  sourceNote: document.querySelector("#sourceNote"),
  uploadMeta: document.querySelector("#uploadMeta"),
  branchFilter: document.querySelector("#branchFilter"),
  segmentFilter: document.querySelector("#segmentFilter"),
  tkBaruFilter: document.querySelector("#tkBaruFilter"),
  messageFilter: document.querySelector("#messageFilter"),
  resetFilters: document.querySelector("#resetFilters"),
  kpiTotal: document.querySelector("#kpiTotal"),
  kpiNew: document.querySelector("#kpiNew"),
  kpiOld: document.querySelector("#kpiOld"),
  kpiTopBranch: document.querySelector("#kpiTopBranch"),
  kpiTopMessage: document.querySelector("#kpiTopMessage"),
  insightSubtitle: document.querySelector("#insightSubtitle"),
  insightPanel: document.querySelector("#insightPanel"),
  branchSubtitle: document.querySelector("#branchSubtitle"),
  branchBars: document.querySelector("#branchBars"),
  messageSubtitle: document.querySelector("#messageSubtitle"),
  messageBars: document.querySelector("#messageBars"),
  pembinaSubtitle: document.querySelector("#pembinaSubtitle"),
  pembinaPanel: document.querySelector("#pembinaPanel"),
  tableSubtitle: document.querySelector("#tableSubtitle"),
  downloadFiltered: document.querySelector("#downloadFiltered"),
  searchInput: document.querySelector("#searchInput"),
  previewHead: document.querySelector("#previewHead"),
  previewBody: document.querySelector("#previewBody"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  pageInfo: document.querySelector("#pageInfo"),
  toast: document.querySelector("#toast"),
};

const fmtNumber = new Intl.NumberFormat("id-ID");
const fmtPct = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 1 });

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function isExpired(saved) {
  return !saved?.savedAt || localDateKey(saved.savedAt) !== localDateKey();
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "_");
}

function read(row, column) {
  return String(row[column] ?? "").trim();
}

function officeLabel(code) {
  const key = String(code ?? "").trim();
  const office = officeLookup.get(key);
  return office ? `${key} - ${office.name}` : key || "-";
}

function tkBaruLabel(value) {
  return String(value ?? "").trim() === "1" ? "TK Baru" : "TK Lama";
}

function parseDelimited(text) {
  const normalized = String(text ?? "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return { headers: [], rows: [] };
  const firstLine = normalized.split("\n")[0] ?? "";
  const delimiter = firstLine.includes("|") ? "|" : firstLine.includes("\t") ? "\t" : ",";
  const lines = normalized.split("\n").filter(Boolean);
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader);
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

function splitLine(line, delimiter) {
  const result = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

async function readWorkbook(file) {
  if (!window.XLSX) throw new Error("Parser Excel belum tersedia. Simpan file sebagai TXT/CSV atau aktifkan CDN SheetJS.");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  const headers = Object.keys(rows[0] ?? {}).map(normalizeHeader);
  return {
    headers,
    rows: rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? "").trim()]))),
  };
}

async function readUploadedFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return readWorkbook(file);
  return parseDelimited(await file.text());
}

function validateDataset(headers, rows) {
  const required = ["KODE_WILAYAH", "KODE_KANTOR", "KODE_SEGMEN", "KPJ", "NOMOR_IDENTITAS", "NAMA_LENGKAP", "PEMBINA", "TK_BARU", "P_MSG"];
  const missing = required.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Kolom wajib tidak ditemukan: ${missing.join(", ")}`);
  if (!rows.some((row) => read(row, "KODE_WILAYAH") === "905")) {
    throw new Error("File tidak memiliki data Kanwil 905.");
  }
}

async function handleFile(file) {
  try {
    const loaded = await readUploadedFile(file);
    validateDataset(loaded.headers, loaded.rows);
    state.rows = loaded.rows.filter((row) => read(row, "KODE_WILAYAH") === "905");
    state.columns = loaded.headers;
    state.fileName = file.name;
    resetStateFilters();
    await saveData();
    render();
    showToast("Data pemadanan berhasil dimuat.");
  } catch (error) {
    showToast(error.message);
  } finally {
    els.fileInput.value = "";
  }
}

function filteredRows() {
  const search = state.search.toLowerCase();
  return state.rows
    .filter((row) => state.branch === "ALL" || read(row, "KODE_KANTOR") === state.branch)
    .filter((row) => state.segment === "ALL" || read(row, "KODE_SEGMEN") === state.segment)
    .filter((row) => state.tkBaru === "ALL" || read(row, "TK_BARU") === state.tkBaru)
    .filter((row) => state.message === "ALL" || read(row, "P_MSG") === state.message)
    .filter((row) => {
      if (!search) return true;
      return ["KODE_KANTOR", "NPP", "NAMA_PERUSAHAAN", "KPJ", "NOMOR_IDENTITAS", "NAMA_LENGKAP", "PEMBINA", "P_MSG"]
        .some((column) => read(row, column).toLowerCase().includes(search));
    });
}

function groupCount(rows, keyFn) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyFn(row) || "-";
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  return [...grouped.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || String(a.name).localeCompare(String(b.name), "id", { numeric: true }));
}

function render() {
  if (!state.rows.length) {
    renderEmpty();
    return;
  }
  renderFilters();
  const rows = filteredRows();
  const branchGroups = groupCount(rows, (row) => read(row, "KODE_KANTOR"));
  const messageGroups = groupCount(rows, (row) => read(row, "P_MSG"));
  const pembinaGroups = groupPembinaNpp(rows);
  const total = rows.length;
  const tkNew = rows.filter((row) => read(row, "TK_BARU") === "1").length;
  const tkOld = rows.filter((row) => read(row, "TK_BARU") === "0").length;

  els.sourceNote.textContent = `${state.fileName}; ${fmtNumber.format(state.rows.length)} baris sumber. Data lama sudah diganti.`;
  els.uploadMeta.textContent = `Data terakhir: ${state.fileName} | tersimpan ${new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
  els.kpiTotal.textContent = fmtNumber.format(total);
  els.kpiNew.textContent = fmtNumber.format(tkNew);
  els.kpiOld.textContent = fmtNumber.format(tkOld);
  els.kpiTopBranch.textContent = branchGroups[0] ? officeLabel(branchGroups[0].name) : "-";
  els.kpiTopMessage.textContent = messageGroups[0]?.name ?? "-";
  renderInsights(rows, branchGroups, messageGroups, tkNew);
  renderBars(els.branchBars, branchGroups.slice(0, 10), total, officeLabel);
  renderBars(els.messageBars, messageGroups.slice(0, 8), total, (value) => value);
  renderPembina(pembinaGroups);
  renderPreview(rows);
}

function renderFilters() {
  const rows = state.rows;
  setOptions(els.branchFilter, [{ value: "ALL", label: "Semua Cabang" }, ...unique(rows, "KODE_KANTOR").map((value) => ({ value, label: officeLabel(value) }))], state.branch);
  setOptions(els.segmentFilter, [{ value: "ALL", label: "Semua Segmen" }, ...unique(rows, "KODE_SEGMEN").map((value) => ({ value, label: value }))], state.segment);
  setOptions(els.messageFilter, [{ value: "ALL", label: "Semua Pesan" }, ...unique(rows, "P_MSG").map((value) => ({ value, label: value }))], state.message);
  els.tkBaruFilter.value = state.tkBaru;
}

function renderInsights(rows, branchGroups, messageGroups, tkNew) {
  const total = rows.length;
  const topBranch = branchGroups[0];
  const topMessage = messageGroups[0];
  const topSegment = groupCount(rows, (row) => read(row, "KODE_SEGMEN"))[0];
  els.insightSubtitle.textContent = `${fmtNumber.format(total)} data pemadanan sesuai filter.`;
  els.insightPanel.innerHTML = `
    <article class="insight-item">
      <strong>Cabang prioritas</strong>
      <span>${topBranch ? `${escapeHtml(officeLabel(topBranch.name))} memiliki ${fmtNumber.format(topBranch.total)} beban atau ${fmtPct.format(total ? topBranch.total / total : 0)} dari total.` : "Belum ada data."}</span>
    </article>
    <article class="insight-item">
      <strong>Segmen dominan</strong>
      <span>${topSegment ? `${escapeHtml(topSegment.name)} menjadi segmen terbesar dengan ${fmtNumber.format(topSegment.total)} data.` : "Belum ada data."}</span>
    </article>
    <article class="insight-item">
      <strong>Pesan dominan</strong>
      <span>${topMessage ? `${escapeHtml(topMessage.name)} muncul ${fmtNumber.format(topMessage.total)} kali.` : "Belum ada data."}</span>
    </article>
    <article class="insight-item">
      <strong>Fokus cepat</strong>
      <span>Prioritaskan ${topBranch ? `<strong>${escapeHtml(officeLabel(topBranch.name))}</strong>` : "cabang terbesar"}; ditemukan <strong>${fmtNumber.format(tkNew)}</strong> TK Baru dan <strong>${fmtNumber.format(rows.filter((row) => read(row, "TK_BARU") === "0").length)}</strong> TK Lama pada filter aktif.</span>
    </article>
  `;
}

function renderBars(container, groups, total, labelFn) {
  if (!groups.length) {
    container.innerHTML = `<p class="empty">Tidak ada data.</p>`;
    return;
  }
  const max = Math.max(...groups.map((item) => item.total), 1);
  container.innerHTML = groups.map((item) => `
    <article class="bar-row">
      <div class="bar-meta">
        <span>${escapeHtml(labelFn(item.name))}</span>
        <em>${fmtPct.format(total ? item.total / total : 0)} &nbsp; ${fmtNumber.format(item.total)} data</em>
      </div>
      <div class="bar-track"><i style="--bar:${Math.max(2, (item.total / max) * 100)}%"></i></div>
    </article>
  `).join("");
}

function renderPembina(groups) {
  els.pembinaSubtitle.textContent = `${fmtNumber.format(groups.length)} kombinasi pembina dan NPP memiliki beban pemadanan.`;
  if (!groups.length) {
    els.pembinaPanel.innerHTML = `<p class="empty">Tidak ada data.</p>`;
    return;
  }
  els.pembinaPanel.innerHTML = `
    <div class="table-wrap pemadanan-pembina-wrap">
      <table>
        <thead>
          <tr>
            <th>Kode Kantor</th>
            <th>Nama Kantor</th>
            <th>Pembina</th>
            <th>NPP</th>
            <th class="num">Jumlah TK Invalid</th>
          </tr>
        </thead>
        <tbody>
          ${groups.slice(0, 100).map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.office)}</strong></td>
              <td>${escapeHtml(item.officeName)}</td>
              <td>${escapeHtml(item.pembina)}</td>
              <td>${escapeHtml(item.npp)}</td>
              <td class="num">${fmtNumber.format(item.total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function groupPembinaNpp(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const office = read(row, "KODE_KANTOR") || "-";
    const pembina = read(row, "PEMBINA") || "-";
    const npp = read(row, "NPP") || "-";
    const key = `${office}|${pembina}|${npp}`;
    const current = grouped.get(key) ?? {
      office,
      officeName: officeLookup.get(office)?.name ?? "-",
      pembina,
      npp,
      total: 0,
    };
    current.total += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) => b.total - a.total || a.office.localeCompare(b.office, "id", { numeric: true }));
}

function renderPreview(rows) {
  const columns = ["KODE_KANTOR", "NAMA_KANTOR", "KODE_SEGMEN", "NPP", "NAMA_PERUSAHAAN", "KPJ", "NOMOR_IDENTITAS", "NAMA_LENGKAP", "PEMBINA", "TK_BARU", "P_MSG"];
  const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;
  const start = (state.page - 1) * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);
  els.previewHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column === "TK_BARU" ? "STATUS TK" : column)}</th>`).join("")}</tr>`;
  els.previewBody.innerHTML = pageRows.map((row) => `
    <tr>
      ${columns.map((column) => {
        const value = column === "NAMA_KANTOR"
          ? officeLookup.get(read(row, "KODE_KANTOR"))?.name ?? "-"
          : column === "TK_BARU"
            ? tkBaruLabel(read(row, column))
            : read(row, column);
        return `<td>${escapeHtml(value)}</td>`;
      }).join("")}
    </tr>
  `).join("");
  const first = rows.length ? start + 1 : 0;
  const last = Math.min(start + pageRows.length, rows.length);
  els.tableSubtitle.textContent = `${fmtNumber.format(rows.length)} baris cocok; menampilkan ${fmtNumber.format(pageRows.length)} baris.`;
  els.pageInfo.textContent = `Halaman ${fmtNumber.format(state.page)} / ${fmtNumber.format(totalPages)} (${fmtNumber.format(first)}-${fmtNumber.format(last)} dari ${fmtNumber.format(rows.length)})`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= totalPages;
  els.downloadFiltered.disabled = !rows.length;
}

function renderEmpty() {
  els.sourceNote.textContent = "Upload data pemadanan TK untuk mulai profiling.";
  els.uploadMeta.textContent = "Belum ada data tersimpan.";
  [els.kpiTotal, els.kpiNew, els.kpiTopBranch, els.kpiTopMessage].forEach((element) => {
    element.textContent = "-";
  });
  els.kpiOld.textContent = "-";
  els.insightPanel.innerHTML = `<p class="empty">Belum ada data.</p>`;
  els.branchBars.innerHTML = `<p class="empty">Upload file TXT delimiter |, CSV, atau XLSX.</p>`;
  els.messageBars.innerHTML = `<p class="empty">Belum ada data.</p>`;
  els.pembinaPanel.innerHTML = `<p class="empty">Belum ada data.</p>`;
  els.previewHead.innerHTML = "";
  els.previewBody.innerHTML = "";
  els.tableSubtitle.textContent = "Belum ada data.";
  els.pageInfo.textContent = "Halaman 1";
  els.prevPage.disabled = true;
  els.nextPage.disabled = true;
  els.downloadFiltered.disabled = true;
  setOptions(els.branchFilter, [{ value: "ALL", label: "Semua Cabang" }], "ALL");
  setOptions(els.segmentFilter, [{ value: "ALL", label: "Semua Segmen" }], "ALL");
  setOptions(els.messageFilter, [{ value: "ALL", label: "Semua Pesan" }], "ALL");
}

function unique(rows, column) {
  return [...new Set(rows.map((row) => read(row, column)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
}

function setOptions(select, options, selectedValue) {
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("");
  select.value = selectedValue;
}

function resetStateFilters() {
  state.branch = "ALL";
  state.segment = "ALL";
  state.tkBaru = "ALL";
  state.message = "ALL";
  state.search = "";
  state.page = 1;
  els.searchInput.value = "";
}

function downloadFilteredCsv() {
  const rows = filteredRows();
  if (!rows.length) {
    showToast("Tidak ada data untuk didownload.");
    return;
  }
  const columns = ["TGL_PROSES", "KODE_KANTOR", "NAMA_KANTOR", "KODE_SEGMEN", "NPP", "NAMA_PERUSAHAAN", "KPJ", "NOMOR_IDENTITAS", "NAMA_LENGKAP", "TGL_LAHIR", "PEMBINA", "TK_BARU", "P_MSG"];
  const csv = [
    columns.map(csvEscape).join(","),
    ...rows.map((row) => columns.map((column) => {
      if (column === "NAMA_KANTOR") return officeLookup.get(read(row, "KODE_KANTOR"))?.name ?? "";
      return column === "TK_BARU" ? tkBaruLabel(read(row, column)) : read(row, column);
    }).map(csvEscape).join(",")),
  ].join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `tk-pemadanan-${state.branch === "ALL" ? "905" : state.branch}.csv`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
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

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("qualityProfilerDb", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("datasets");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putDb(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("datasets", "readwrite");
    tx.objectStore("datasets").put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getDb(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("datasets", "readonly");
    const request = tx.objectStore("datasets").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteDb(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("datasets", "readwrite");
    tx.objectStore("datasets").delete(key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function saveData() {
  await putDb(STORAGE_KEY, {
    savedAt: new Date().toISOString(),
    fileName: state.fileName,
    columns: state.columns,
    rows: state.rows,
  });
}

async function restoreData() {
  try {
    const saved = await getDb(STORAGE_KEY);
    if (!saved) return;
    if (isExpired(saved)) {
      await deleteDb(STORAGE_KEY);
      showToast("Data pemadanan tersimpan sudah expired. Upload ulang data hari ini.");
      return;
    }
    state.rows = saved.rows ?? [];
    state.columns = saved.columns ?? [];
    state.fileName = saved.fileName ?? "data tersimpan";
    render();
  } catch (error) {
    console.warn("Gagal memulihkan data pemadanan.", error);
  }
}

async function clearData() {
  await deleteDb(STORAGE_KEY);
  state.rows = [];
  state.columns = [];
  state.fileName = "";
  resetStateFilters();
  render();
  showToast("Data pemadanan dihapus.");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 3600);
}

els.fileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) handleFile(file);
});
els.clearData.addEventListener("click", clearData);
els.branchFilter.addEventListener("change", (event) => {
  state.branch = event.target.value;
  state.page = 1;
  render();
});
els.segmentFilter.addEventListener("change", (event) => {
  state.segment = event.target.value;
  state.page = 1;
  render();
});
els.tkBaruFilter.addEventListener("change", (event) => {
  state.tkBaru = event.target.value;
  state.page = 1;
  render();
});
els.messageFilter.addEventListener("change", (event) => {
  state.message = event.target.value;
  state.page = 1;
  render();
});
els.resetFilters.addEventListener("click", () => {
  resetStateFilters();
  render();
});
els.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  state.page = 1;
  render();
});
els.prevPage.addEventListener("click", () => {
  state.page -= 1;
  render();
});
els.nextPage.addEventListener("click", () => {
  state.page += 1;
  render();
});
els.downloadFiltered.addEventListener("click", downloadFilteredCsv);

renderEmpty();
restoreData();
