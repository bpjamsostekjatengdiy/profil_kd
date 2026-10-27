(() => {
  const gp = {
    before: null, after: null, branch: "ALL", pembina: "ALL",
    metrics: ["NIK", "NAMA", "TGL LAHIR", "IBU", "EMAIL / HANDPHONE"],
    tables: {
      npp: { page: 1, sort: { key: "total|progress", direction: "asc" }, filters: { search: "", progress: "ALL" } },
      pembina: { page: 1, sort: { key: "total|progress", direction: "asc" }, filters: { search: "", progress: "ALL" } },
      branch: { sort: { key: "progress", direction: "asc" }, filters: { search: "", progress: "ALL" } },
    },
  };
  const ui = Object.fromEntries([
    "SourceNote", "BranchFilter", "PembinaFilter", "Reset", "Error", "BeforeLabel", "AfterLabel",
    "Before", "After", "Change", "ChangeNote", "Improved", "NppSubtitle", "NppBody", "PembinaSubtitle", "PembinaHead", "PembinaBody",
    "BranchSubtitle", "BranchBody", "BranchFoot",
    "BranchHead", "NppHead", "NppPagination", "PembinaPagination",
    "NppFoot", "PembinaFoot",
  ].map((name) => [name, document.querySelector(`#gp${name}`)]));
  const number = new Intl.NumberFormat("id-ID");
  const compareText = (a, b) => String(a).localeCompare(String(b), "id", { numeric: true });
  const clean = (value) => String(value ?? "").trim();

  function processDate(value) {
    const raw = clean(value);
    const local = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s|$)/);
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]|$)/);
    if (!local && !iso) return null;
    const [year, month, day] = local ? [local[3], local[2], local[1]].map(Number) : iso.slice(1, 4).map(Number);
    const time = Date.UTC(year, month - 1, day);
    const date = new Date(time);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return { time, label: `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}` };
  }

  function snapshot(loaded, label) {
    if (!loaded.headers.includes("TGL_PROSES")) throw new Error(`${label}: kolom TGL_PROSES tidak ditemukan.`);
    const eligible = loaded.rows.filter((row) => clean(row.KODE_WILAYAH) === "905" && clean(row.KODE_SEGMEN).toUpperCase() === "PU");
    const dates = eligible.map((row) => processDate(row.TGL_PROSES)).filter(Boolean);
    if (!dates.length) throw new Error(`${label}: tanggal proses untuk Kanwil 905 segmen PU belum tersedia.`);
    const date = dates.reduce((max, item) => item.time > max.time ? item : max);
    const rows = eligible.filter((row) => processDate(row.TGL_PROSES)?.time === date.time);
    const owners = new Map();
    for (const row of rows) {
      const branch = clean(row.KODE_KANTOR);
      const name = clean(row.PEMBINA ?? row.NAMA_PEMBINA ?? row.KODE_PEMBINA) || "-";
      const code = clean(row.KODE_PEMBINA) || name;
      owners.set(JSON.stringify([branch, name]), { key: JSON.stringify([branch, code]), name, branch, code });
    }
    const converted = convertQualityRows(loaded.headers, rows);
    if (!converted) throw new Error(`${label}: kolom validasi kualitas tidak ditemukan.`);
    const entries = converted.rows.map((row) => {
      const branch = clean(row[normalizedIssueColumns.cabang]);
      const name = clean(row[normalizedIssueColumns.pembina]) || "-";
      const owner = owners.get(JSON.stringify([branch, name]));
      return {
        branch, npp: clean(row[normalizedIssueColumns.npp]), name,
        pembina: owner?.key ?? JSON.stringify([branch, name]),
        element: clean(row[normalizedIssueColumns.elemen]),
      };
    });
    const entities = rows.map((row) => {
      const branch = clean(row.KODE_KANTOR);
      const name = clean(row.PEMBINA ?? row.NAMA_PEMBINA ?? row.KODE_PEMBINA) || "-";
      return { branch, name, npp: clean(row.NPP), pembina: owners.get(JSON.stringify([branch, name])).key };
    });
    return { date, entries, entities, owners: [...owners.values()], sourceRows: rows.length, label };
  }

  function filtered(snapshotData, field = "entries") {
    return snapshotData[field].filter((entry) =>
      (gp.branch === "ALL" || entry.branch === gp.branch) && (gp.pembina === "ALL" || entry.pembina === gp.pembina));
  }

  function aggregate(entries, kind, entities) {
    const groups = new Map();
    const groupFor = (entry) => {
      if (kind === "npp" && (!entry.npp || entry.npp === "-")) return null;
      if (kind === "pembina" && entry.name === "-") return null;
      const key = kind === "npp" ? JSON.stringify([entry.branch, entry.npp]) : entry.pembina;
      const group = groups.get(key) ?? { key, branch: entry.branch, npp: entry.npp, names: new Set(), total: 0, metrics: {} };
      group.names.add(entry.name);
      groups.set(key, group);
      return group;
    };
    for (const entity of entities) groupFor(entity);
    for (const entry of entries) {
      const group = groupFor(entry);
      if (!group) continue;
      group.total += 1;
      group.metrics[entry.element] = (group.metrics[entry.element] || 0) + 1;
    }
    return groups;
  }

  function changes(beforeEntries, afterEntries, kind, beforeEntities, afterEntities) {
    const before = aggregate(beforeEntries, kind, beforeEntities);
    const after = aggregate(afterEntries, kind, afterEntities);
    return [...new Set([...before.keys(), ...after.keys()])].map((key) => {
      const previous = before.get(key);
      const current = after.get(key);
      return {
        ...(current || previous), previous: previous?.total || 0, current: current?.total || 0,
        reduction: (previous?.total || 0) - (current?.total || 0),
        previousMetrics: previous?.metrics || {}, currentMetrics: current?.metrics || {},
      };
    });
  }

  function updateFilters() {
    const owners = new Map([...gp.before.owners, ...gp.after.owners].map((owner) => [owner.key, owner]));
    const branches = [...new Set([...owners.values()].map((owner) => owner.branch).filter(Boolean))].sort(compareText);
    setOptions(ui.BranchFilter, [{ value: "ALL", label: "Semua Cabang" }, ...branches.map((code) => ({ value: code, label: officeLabel(code) }))], gp.branch);
    const filteredOwners = [...owners.values()].filter((owner) => gp.branch === "ALL" || owner.branch === gp.branch)
      .sort((a, b) => compareText(a.name, b.name) || compareText(a.branch, b.branch));
    if (!filteredOwners.some((owner) => owner.key === gp.pembina)) gp.pembina = "ALL";
    setOptions(ui.PembinaFilter, [{ value: "ALL", label: "Semua Pembina" }, ...filteredOwners.map((owner) => ({ value: owner.key, label: `${owner.branch} - ${owner.name}` }))], gp.pembina);
  }

  function metricCell(previous, current, total = false) {
    const delta = current - previous;
    const tone = delta < 0 ? "good" : delta > 0 ? "bad" : "neutral";
    const signed = `${delta > 0 ? "+" : ""}${number.format(delta)}`;
    const description = `Awal ${number.format(previous)}, sisa ${number.format(current)}, perubahan ${signed}`;
    return `<td class="num${total ? " gp-total-cell" : ""}"><div class="gp-metric" title="${escapeHtml(description)}" aria-label="${escapeHtml(description)}"><span class="gp-initial">${number.format(previous)}</span><strong>${number.format(current)}</strong><span class="tag ${tone}">${signed}</span></div></td>`;
  }

  function totalsRow(items, kind) {
    const sum = (value) => items.reduce((total, item) => total + value(item), 0);
    const previous = sum((item) => item.previous);
    const current = sum((item) => item.current);
    const metrics = kind === "pembina" ? gp.metrics.map((metric) =>
      metricCell(sum((item) => item.previousMetrics[metric] || 0), sum((item) => item.currentMetrics[metric] || 0))).join("") : "";
    return `<tr><td colspan="${kind === "npp" ? 4 : 3}"><strong>Total</strong><small class="gp-total-note">Seluruh data terfilter</small></td>${metricCell(previous, current, true)}${metrics}</tr>`;
  }

  function sortButton(label, table, key, compact = false) {
    const sort = gp.tables[table].sort;
    const active = sort.key === key;
    const icon = active ? sort.direction === "asc" ? "&#9650;" : "&#9660;" : "&#8597;";
    return `<button type="button" class="gp-sort${compact ? " gp-sort-small" : ""}${active ? " active" : ""}" data-gp-table="${table}" data-gp-sort="${escapeHtml(key)}" aria-pressed="${active}" title="Urutkan ${escapeHtml(label)}${active ? sort.direction === "asc" ? ": kecil ke besar" : ": besar ke kecil" : ""}"><span>${escapeHtml(label)}</span><i aria-hidden="true">${icon}</i></button>`;
  }

  function textHeader(label, table, key, className = "") {
    const sort = gp.tables[table].sort;
    const direction = sort.key === key ? sort.direction === "asc" ? "ascending" : "descending" : "none";
    return `<th class="${className}" aria-sort="${direction}">${sortButton(label, table, key)}</th>`;
  }

  function metricHeader(label, table, metric) {
    const sort = gp.tables[table].sort;
    const active = sort.key.startsWith(`${metric}|`);
    const direction = active ? sort.direction === "asc" ? "ascending" : "descending" : "none";
    return `<th class="num" aria-sort="${direction}">${sortButton(label, table, `${metric}|progress`)}<small class="gp-metric-labels">${[
      ["previous", "Awal"], ["current", "Sisa"], ["progress", "Progres"],
    ].map(([part, name]) => sortButton(name, table, `${metric}|${part}`, true)).join("")}</small></th>`;
  }

  function sortedRows(rows, table) {
    const { key, direction } = gp.tables[table].sort;
    const value = (row) => {
      if (key === "npp" || key === "branch") return row[key];
      if (key === "pembina") return [...row.names].sort(compareText).join(", ");
      if (key === "name") return officeLookup.get(row.branch)?.name || row.branch;
      if (table === "branch") return key === "progress" ? row.after - row.before : key === "previous" ? row.before : row.after;
      const [metric, part] = key.split("|");
      const previous = metric === "total" ? row.previous : row.previousMetrics[metric] || 0;
      const current = metric === "total" ? row.current : row.currentMetrics[metric] || 0;
      return part === "progress" ? current - previous : part === "previous" ? previous : current;
    };
    return rows.slice().sort((a, b) => {
      const left = value(a);
      const right = value(b);
      const comparison = typeof left === "number" && typeof right === "number" ? left - right : compareText(left, right);
      return comparison * (direction === "asc" ? 1 : -1) || compareText(a.branch, b.branch) || compareText(a.key || "", b.key || "");
    });
  }

  function localFilteredRows(rows, table) {
    const filters = gp.tables[table].filters;
    const terms = filters.search.trim().toLocaleLowerCase("id").split(/\s+/).filter(Boolean);
    return rows.filter((row) => {
      const delta = table === "branch" ? row.after - row.before : row.current - row.previous;
      if (filters.progress === "decreased" && delta >= 0) return false;
      if (filters.progress === "increased" && delta <= 0) return false;
      if (filters.progress === "unchanged" && delta !== 0) return false;
      const text = [row.branch, officeLookup.get(row.branch)?.name, table === "npp" ? row.npp : "", ...(row.names || [])].join(" ").toLocaleLowerCase("id");
      return terms.every((term) => text.includes(term));
    });
  }

  function clearLocalFilters(table) {
    gp.tables[table].filters = { search: "", progress: "ALL" };
    document.querySelector(`[data-gp-search="${table}"]`).value = "";
    document.querySelector(`[data-gp-progress="${table}"]`).value = "ALL";
    if ("page" in gp.tables[table]) gp.tables[table].page = 1;
  }

  function paginatedRows(rows, table) {
    const size = 10;
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const state = gp.tables[table];
    state.page = Math.max(1, Math.min(pages, state.page));
    const start = (state.page - 1) * size;
    const visible = sortedRows(rows, table).slice(start, start + size);
    const pagination = table === "npp" ? ui.NppPagination : ui.PembinaPagination;
    pagination.innerHTML = `<span class="gp-page-range">${number.format(rows.length ? start + 1 : 0)}-${number.format(start + visible.length)} dari ${number.format(rows.length)}</span><div class="gp-page-controls"><button type="button" class="gp-page-arrow" data-gp-table="${table}" data-gp-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="Halaman sebelumnya" title="Halaman sebelumnya">&#8249;</button><label>Hal. <input type="number" min="1" max="${pages}" value="${state.page}" step="1" data-gp-page-input="${table}" aria-label="Nomor halaman ${table === "npp" ? "NPP" : "pembina"}" ${!rows.length ? "disabled" : ""} /> / ${number.format(pages)}</label><button type="button" class="gp-page-arrow" data-gp-table="${table}" data-gp-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""} aria-label="Halaman berikutnya" title="Halaman berikutnya">&#8250;</button></div>`;
    return { visible, start };
  }

  function renderBranchTotals(before, after, period) {
    const totals = (entries) => {
      const groups = new Map();
      for (const entry of entries) groups.set(entry.branch, (groups.get(entry.branch) || 0) + 1);
      return groups;
    };
    const previous = totals(before);
    const current = totals(after);
    const owners = [...gp.before.owners, ...gp.after.owners].filter((owner) =>
      (gp.branch === "ALL" || owner.branch === gp.branch) && (gp.pembina === "ALL" || owner.key === gp.pembina));
    const branches = sortedRows(localFilteredRows([...new Set([...owners.map((owner) => owner.branch), ...previous.keys(), ...current.keys()])]
      .map((branch) => ({ branch, before: previous.get(branch) || 0, after: current.get(branch) || 0 })), "branch"), "branch");
    const changeCell = (value) => `<td class="num"><span class="tag ${value < 0 ? "good" : value > 0 ? "bad" : "neutral"}">${value > 0 ? "+" : ""}${number.format(value)}</span></td>`;
    ui.BranchSubtitle.textContent = `${period} | ${number.format(branches.length)} kantor | Mengikuti filter cabang dan pembina.`;
    ui.BranchHead.innerHTML = `<tr><th class="gp-rank-col">No</th>${textHeader("Kode Kantor", "branch", "branch")}${textHeader("Nama Kantor", "branch", "name")}${textHeader("Beban Awal", "branch", "previous", "num")}${textHeader("Sisa Beban", "branch", "current", "num")}${textHeader("Progres +/-", "branch", "progress", "num")}</tr>`;
    ui.BranchBody.innerHTML = branches.map((row, index) => `<tr data-branch="${escapeHtml(row.branch)}"><td class="gp-rank">${index + 1}</td><td>${escapeHtml(row.branch || "-")}</td><td>${escapeHtml(officeLookup.get(row.branch)?.name || row.branch || "Tanpa kode kantor")}</td><td class="num">${number.format(row.before)}</td><td class="num"><strong>${number.format(row.after)}</strong></td>${changeCell(row.after - row.before)}</tr>`).join("")
      || '<tr><td colspan="6" class="gp-empty">Tidak ada kantor untuk filter ini.</td></tr>';
    const totalBefore = branches.reduce((sum, row) => sum + row.before, 0);
    const totalAfter = branches.reduce((sum, row) => sum + row.after, 0);
    ui.BranchFoot.innerHTML = `<tr><td colspan="3"><strong>Total</strong><small class="gp-total-note">Seluruh data terfilter</small></td><td class="num"><strong>${number.format(totalBefore)}</strong></td><td class="num"><strong>${number.format(totalAfter)}</strong></td>${changeCell(totalAfter - totalBefore)}</tr>`;
  }

  function render() {
    updateFilters();
    const before = filtered(gp.before);
    const after = filtered(gp.after);
    const beforeEntities = filtered(gp.before, "entities");
    const afterEntities = filtered(gp.after, "entities");
    const allNpps = changes(before, after, "npp", beforeEntities, afterEntities);
    const allPembinas = changes(before, after, "pembina", beforeEntities, afterEntities);
    const npps = localFilteredRows(allNpps, "npp");
    const pembinas = localFilteredRows(allPembinas, "pembina");
    const delta = after.length - before.length;
    const period = `${gp.before.date.label} s.d. ${gp.after.date.label}`;
    renderBranchTotals(before, after, period);
    const scope = gp.branch === "ALL" ? "Semua Cabang" : officeLabel(gp.branch);
    ui.SourceNote.textContent = `Periode ${period} | ${scope} | Segmen PU${gp.before.date.time === gp.after.date.time ? " | Kedua snapshot memiliki tanggal proses yang sama" : ""}`;
    ui.BeforeLabel.textContent = `Beban Awal (${gp.before.date.label})`;
    ui.AfterLabel.textContent = `Beban Terakhir (${gp.after.date.label})`;
    ui.Before.textContent = number.format(before.length);
    ui.After.textContent = number.format(after.length);
    ui.Change.textContent = `${delta > 0 ? "+" : ""}${number.format(delta)}`;
    ui.Change.className = delta < 0 ? "good-text" : delta > 0 ? "bad-text" : "";
    ui.ChangeNote.textContent = delta < 0 ? "Beban berkurang" : delta > 0 ? "Beban bertambah" : "Beban tetap";
    const nppImproved = npps.filter((item) => item.reduction > 0).length;
    const pembinaImproved = pembinas.filter((item) => item.reduction > 0).length;
    ui.Improved.textContent = `${number.format(allNpps.filter((item) => item.reduction > 0).length)} / ${number.format(allPembinas.filter((item) => item.reduction > 0).length)}`;
    ui.NppSubtitle.textContent = `${period} | ${number.format(npps.length)} NPP; ${number.format(nppImproved)} membaik.`;
    ui.PembinaSubtitle.textContent = `${period} | ${number.format(pembinas.length)} pembina; ${number.format(pembinaImproved)} membaik.`;
    ui.NppHead.innerHTML = `<tr><th class="gp-rank-col">No</th>${textHeader("NPP", "npp", "npp")}${textHeader("Kantor", "npp", "branch")}${textHeader("Pembina", "npp", "pembina")}${metricHeader("Total Beban", "npp", "total")}</tr>`;
    const nppPage = paginatedRows(npps, "npp");
    ui.NppBody.innerHTML = nppPage.visible.map((item, index) => `<tr><td class="gp-rank">${nppPage.start + index + 1}</td><td><strong>${escapeHtml(item.npp)}</strong></td><td title="${escapeHtml(officeLabel(item.branch))}">${escapeHtml(item.branch)}</td><td>${[...item.names].map(escapeHtml).join(", ")}</td>${metricCell(item.previous, item.current, true)}</tr>`).join("")
      || '<tr><td colspan="5" class="gp-empty">Tidak ada NPP untuk filter ini.</td></tr>';
    ui.NppFoot.innerHTML = totalsRow(npps, "npp");
    ui.PembinaHead.innerHTML = `<tr><th class="gp-rank-col">No</th>${textHeader("Pembina", "pembina", "pembina")}${textHeader("Kantor", "pembina", "branch")}${metricHeader("Total Beban", "pembina", "total")}${gp.metrics.map((metric) => metricHeader(metric, "pembina", metric)).join("")}</tr>`;
    const pembinaPage = paginatedRows(pembinas, "pembina");
    ui.PembinaBody.innerHTML = pembinaPage.visible.map((item, index) => `<tr><td class="gp-rank">${pembinaPage.start + index + 1}</td><td>${[...item.names].map(escapeHtml).join(", ")}</td><td title="${escapeHtml(officeLabel(item.branch))}">${escapeHtml(item.branch)}</td>${metricCell(item.previous, item.current, true)}${gp.metrics.map((metric) => metricCell(item.previousMetrics[metric] || 0, item.currentMetrics[metric] || 0)).join("")}</tr>`).join("")
      || `<tr><td colspan="${4 + gp.metrics.length}" class="gp-empty">Tidak ada pembina untuk filter ini.</td></tr>`;
    ui.PembinaFoot.innerHTML = totalsRow(pembinas, "pembina");
  }

  function resetPages(resetSort = false) {
    gp.tables.npp.page = 1;
    gp.tables.pembina.page = 1;
    if (resetSort) {
      gp.tables.npp.sort = { key: "total|progress", direction: "asc" };
      gp.tables.pembina.sort = { key: "total|progress", direction: "asc" };
      gp.tables.branch.sort = { key: "progress", direction: "asc" };
      Object.keys(gp.tables).forEach(clearLocalFilters);
    }
  }

  ui.BranchFilter.addEventListener("change", () => { gp.branch = ui.BranchFilter.value; gp.pembina = "ALL"; resetPages(); render(); });
  ui.PembinaFilter.addEventListener("change", () => { gp.pembina = ui.PembinaFilter.value; resetPages(); render(); });
  ui.Reset.addEventListener("click", () => { gp.branch = "ALL"; gp.pembina = "ALL"; resetPages(true); render(); });
  document.addEventListener("click", (event) => {
    const resetFilter = event.target.closest("[data-gp-reset-filter]");
    if (resetFilter) {
      clearLocalFilters(resetFilter.dataset.gpResetFilter);
      render();
      return;
    }
    const sortButton = event.target.closest("[data-gp-sort]");
    if (sortButton) {
      const table = gp.tables[sortButton.dataset.gpTable];
      const key = sortButton.dataset.gpSort;
      const ascendingFirst = ["npp", "branch", "pembina", "name", "progress"].includes(key) || key.endsWith("|progress");
      const direction = table.sort.key === key ? table.sort.direction === "asc" ? "desc" : "asc" : ascendingFirst ? "asc" : "desc";
      table.sort = { key, direction };
      if ("page" in table) table.page = 1;
      render();
    }
    const pageButton = event.target.closest("[data-gp-page]");
    if (pageButton && !pageButton.disabled) {
      gp.tables[pageButton.dataset.gpTable].page = Number(pageButton.dataset.gpPage);
      render();
    }
  });
  document.addEventListener("change", (event) => {
    const localTable = event.target.dataset.gpProgress;
    if (localTable) {
      gp.tables[localTable].filters.progress = event.target.value;
      if ("page" in gp.tables[localTable]) gp.tables[localTable].page = 1;
      render();
      return;
    }
    const table = event.target.dataset.gpPageInput;
    if (!table) return;
    const page = Number(event.target.value);
    gp.tables[table].page = Number.isFinite(page) ? Math.trunc(page) : 1;
    render();
  });
  document.addEventListener("input", (event) => {
    const table = event.target.dataset.gpSearch;
    if (!table || !gp.before || !gp.after) return;
    gp.tables[table].filters.search = event.target.value;
    if ("page" in gp.tables[table]) gp.tables[table].page = 1;
    render();
  });

  async function load() {
    try {
      const sources = await Promise.all([fetchProfilerSheet(profilerConfig.previousSourceUrl), fetchProfilerSheet()]);
      const snapshots = [snapshot(sources[0], "TK aktif H-1"), snapshot(sources[1], "TK aktif update")]
        .sort((a, b) => a.date.time - b.date.time);
      [gp.before, gp.after] = snapshots;
      const extraMetrics = [...new Set(snapshots.flatMap((item) => item.entries.map((entry) => entry.element)))];
      gp.metrics.push(...extraMetrics.filter((metric) => !gp.metrics.includes(metric)).sort(compareText));
      render();
      ui.BranchFilter.disabled = false;
      ui.PembinaFilter.disabled = false;
      ui.Reset.disabled = false;
      document.querySelectorAll("[data-gp-filter-table]").forEach((controls) => { controls.disabled = false; });
    } catch (error) {
      ui.SourceNote.textContent = "Data perbandingan belum dapat dimuat.";
      ui.Error.textContent = error.message;
      ui.Error.hidden = false;
      ui.NppBody.innerHTML = '<tr><td colspan="5" class="gp-empty">Data perbandingan belum tersedia.</td></tr>';
      ui.PembinaBody.innerHTML = '<tr><td class="gp-empty">Data perbandingan belum tersedia.</td></tr>';
      ui.BranchBody.innerHTML = '<tr><td colspan="6" class="gp-empty">Data perbandingan belum tersedia.</td></tr>';
      ui.BranchFoot.innerHTML = "";
      ui.NppPagination.innerHTML = "";
      ui.PembinaPagination.innerHTML = "";
      ui.NppFoot.innerHTML = "";
      ui.PembinaFoot.innerHTML = "";
    }
  }
  load();
})();
