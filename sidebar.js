const sidebar = document.querySelector(".sidebar");

const sidebarGroups = [
  {
    key: "insight",
    label: "Insight",
    items: [
      { href: "index.html", icon: "summary", label: "Summary" },
      { href: "insight.html", icon: "insight", label: "Insight Parameter" },
      { href: "wilayah.html", icon: "shield", label: "Insight Wilayah" },
    ],
  },
  {
    key: "trend",
    label: "Trend",
    items: [
      { href: "progress.html", icon: "trend", label: "IGI Kualitas Data" },
      { href: "kpi-nik.html", icon: "minus", label: "KPI NIK Invalid Pengurang" },
    ],
  },
  {
    key: "profiling",
    label: "Profiling",
    items: [
      { href: "pkbu.html", icon: "building", label: "PKBU" },
      { href: "tk.html", icon: "userCheck", label: "TK Aktif" },
      { href: "tk-na.html", icon: "userMinus", label: "TK NA" },
      { href: "tk-pemadanan.html", icon: "match", label: "TK Pemadanan" },
    ],
  },
];

if (sidebar) {
  renderSidebarMenu();
  bindSidebarToggle();
  bindSidebarDropdowns();
}

function renderSidebarMenu() {
  const nav = sidebar.querySelector("nav");
  if (!nav) return;
  const currentPage = location.pathname.split("/").pop() || "index.html";
  nav.innerHTML = sidebarGroups.map((group) => {
    const activeChild = group.items.some((item) => item.href === currentPage);
    return `
      <section class="nav-section" data-menu-group="${group.key}">
        <button class="nav-group-toggle${activeChild ? " active" : ""}" type="button" aria-expanded="true" data-menu-toggle="${group.key}">
          <span class="nav-chevron">v</span>${group.label}
        </button>
        <div class="nav-group-items">
          ${group.items.map((item) => {
            const active = item.href === currentPage ? " active" : "";
            return `<a class="${active}" href="${item.href}" data-group="${group.key}"><span class="nav-icon">${iconSvg(item.icon)}</span>${item.label}</a>`;
          }).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function iconSvg(name) {
  const icons = {
    summary: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7"></rect><rect x="13" y="4" width="7" height="7"></rect><rect x="4" y="13" width="7" height="7"></rect><rect x="13" y="13" width="7" height="7"></rect></svg>`,
    trend: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16"></path><path d="M5 15l4-4 4 2 6-7"></path><path d="M15 6h4v4"></path></svg>`,
    insight: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M8 14c-1.4-1.1-2-2.7-2-4.3A6 6 0 0 1 18 9.7c0 1.6-.7 3.2-2 4.3-.7.6-1 1.2-1 2H9c0-.8-.3-1.4-1-2Z"></path><path d="M12 3v2"></path></svg>`,
    minus: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M8 12h8"></path></svg>`,
    shield: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.8-2.8 8.2-7 10-4.2-1.8-7-5.2-7-10V6l7-3Z"></path><path d="M8 13l2.5 2.5L16 9"></path></svg>`,
    building: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V5h10v15"></path><path d="M15 9h4v11"></path><path d="M8 8h4M8 12h4M8 16h4"></path></svg>`,
    userCheck: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"></circle><path d="M3 20c1-4 4-6 8-6"></path><path d="M15 17l2 2 4-5"></path></svg>`,
    userMinus: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"></circle><path d="M3 20c1-4 4-6 8-6"></path><path d="M15 17h6"></path></svg>`,
    match: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10"></path><path d="M7 12h6"></path><path d="M7 17h4"></path><path d="M15 16l2 2 4-5"></path><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>`,
  };
  return icons[name] ?? icons.summary;
}

function bindSidebarToggle() {
  const toggle = document.createElement("button");
  toggle.className = "sidebar-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Tampilkan atau sembunyikan sidebar");
  toggle.title = "Tampilkan / sembunyikan sidebar";
  toggle.textContent = "Menu";

  const eyebrow = document.querySelector(".topbar .eyebrow");
  if (eyebrow) {
    eyebrow.prepend(toggle);
    eyebrow.classList.add("with-sidebar-toggle");
  } else {
    document.body.appendChild(toggle);
  }

  const applyState = () => {
    const hidden = localStorage.getItem("kualitasData.sidebarHidden") === "1";
    document.body.classList.toggle("sidebar-hidden", hidden);
    toggle.setAttribute("aria-expanded", String(!hidden));
  };

  toggle.addEventListener("click", () => {
    const nextHidden = !document.body.classList.contains("sidebar-hidden");
    localStorage.setItem("kualitasData.sidebarHidden", nextHidden ? "1" : "0");
    applyState();
  });

  applyState();
}

function bindSidebarDropdowns() {
  const sections = [...sidebar.querySelectorAll(".nav-section")];
  const applyGroupState = (section) => {
    const key = section.dataset.menuGroup;
    const button = section.querySelector("[data-menu-toggle]");
    const items = section.querySelector(".nav-group-items");
    const activeChild = Boolean(section.querySelector("a.active"));
    const collapsed = localStorage.getItem(`kualitasData.nav.${key}.collapsed`) === "1" && !activeChild;
    button.classList.toggle("collapsed", collapsed);
    button.setAttribute("aria-expanded", String(!collapsed));
    items.hidden = collapsed;
  };

  sections.forEach((section) => {
    const key = section.dataset.menuGroup;
    const button = section.querySelector("[data-menu-toggle]");
    button.addEventListener("click", () => {
      const nextCollapsed = !button.classList.contains("collapsed");
      localStorage.setItem(`kualitasData.nav.${key}.collapsed`, nextCollapsed ? "1" : "0");
      applyGroupState(section);
    });
    applyGroupState(section);
  });
}
