"use strict";

/* ------------------------------------------------------------------
   Inti bersama untuk semua modul.

   File ini menangani bagian yang sama di seluruh docs: utilitas,
   tema, navigasi mobile, pencarian, progres, daftar isi, dan toolbar
   mengambang. Logika lab dan kuis tetap tinggal di app.js modul.
   ------------------------------------------------------------------ */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* Penyimpanan bisa diblokir. Progres tetap jalan di sesi ini. */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      /* abaikan */
    }
  }
};

const moduleNamespace = () => document.documentElement.dataset.module || "web3";

let toastTimer = 0;

function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), 2200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (fallbackError) {
      return false;
    }
  }
}

/* ---------- Tema ---------- */

(function initTheme() {
  const root = document.documentElement;
  const button = $("#theme-toggle");
  const label = $("#theme-label");
  if (!button || !label) return;

  const key = moduleNamespace() + ".theme";

  const apply = (theme, persist) => {
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    root.style.colorScheme = theme;
    label.textContent = theme === "dark" ? "Mode terang" : "Mode gelap";
    button.setAttribute("aria-label", theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap");
    if (persist) store.set(key, theme);
  };

  apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

  button.addEventListener("click", () => {
    apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
  });
})();

/* ---------- Navigasi mobile ---------- */

(function initMobileNav() {
  const sidebar = $("#sidebar");
  const toggle = $("#menu-toggle");
  const scrim = $("[data-close-nav]");
  if (!sidebar || !toggle) return;

  let closeButton = $("#sidebar-close", sidebar);
  if (!closeButton) {
    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "icon-btn sidebar-close";
    closeButton.id = "sidebar-close";
    closeButton.setAttribute("aria-label", "Tutup daftar bab");
    closeButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.6"></path></svg>';
    sidebar.prepend(closeButton);
  }

  const isOpen = () => document.body.dataset.navOpen === "true";
  const mobileQuery = window.matchMedia("(max-width: 980px)");

  const syncInert = () => {
    sidebar.inert = mobileQuery.matches && !isOpen();
  };
  syncInert();

  const open = () => {
    document.body.dataset.navOpen = "true";
    toggle.setAttribute("aria-expanded", "true");
    sidebar.inert = false;
    closeButton.focus();
  };

  const close = (returnFocus = true) => {
    document.body.dataset.navOpen = "false";
    toggle.setAttribute("aria-expanded", "false");
    sidebar.inert = mobileQuery.matches;
    if (returnFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => (isOpen() ? close() : open()));
  closeButton.addEventListener("click", () => close());
  if (scrim) scrim.addEventListener("click", () => close());

  sidebar.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !mobileQuery.matches) return;
    const href = link.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;
    const id = href.slice(1);
    close(false);
    const target = id ? document.getElementById(id) : null;
    const heading = target ? target.querySelector("h1, h2") : null;
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      window.setTimeout(() => heading.focus({ preventScroll: true }), 0);
    }
  });

  sidebar.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = $$("a[href], button:not([disabled])", sidebar).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const onViewportChange = () => {
    if (mobileQuery.matches) {
      sidebar.inert = !isOpen();
    } else {
      if (isOpen()) close(false);
      sidebar.inert = false;
      document.body.dataset.navOpen = "false";
    }
  };

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", onViewportChange);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(onViewportChange);
  }
})();

/* ---------- Pencarian ---------- */

(function initSearch() {
  const input = $("#search-input");
  const panel = $("#search-results");
  const wrapper = input ? input.closest(".search") : null;
  if (!input || !panel || !wrapper) return;

  const hint = input.dataset.hint || "Coba kata lain.";
  const sections = $$("main section[data-title]");
  const index = sections.map((section) => {
    const mark = $(".chapter-mark", section);
    const title = section.dataset.title || "Materi";
    let label = "Orientasi";
    if (mark) {
      const clone = mark.cloneNode(true);
      const type = clone.querySelector(".chapter-type");
      if (type) type.remove();
      label = clone.textContent.replace(/\s+/g, " ").trim();
    }
    return {
      id: section.id,
      title: title.trim(),
      mark: label,
      text: section.textContent.replace(/\s+/g, " ").trim()
    };
  });

  const close = () => {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
  };

  const makeSnippet = (text, position, term) => {
    const start = Math.max(0, position - 44);
    const raw = text.slice(start, start + 150).trim();
    const prefix = start > 0 ? "..." : "";
    const suffix = start + 150 < text.length ? "..." : "";
    const safe = escapeHtml(prefix + raw + suffix);
    const escapedTerm = escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(escapedTerm, "gi"), (match) => "<mark>" + match + "</mark>");
  };

  const render = () => {
    const term = input.value.trim();
    if (term.length < 2) {
      close();
      return;
    }

    const lower = term.toLowerCase();
    const results = [];
    for (const item of index) {
      const pos = item.text.toLowerCase().indexOf(lower);
      if (pos === -1 && !item.title.toLowerCase().includes(lower)) continue;
      results.push({ ...item, pos: pos === -1 ? 0 : pos });
      if (results.length >= 8) break;
    }

    if (!results.length) {
      panel.innerHTML = '<p class="search-empty">Tidak ada hasil untuk "' + escapeHtml(term) + '". ' + escapeHtml(hint) + "</p>";
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
      return;
    }

    panel.innerHTML = "<ul>" + results.map((item) => {
      return '<li><a href="#' + item.id + '"><span class="result-chapter">' + escapeHtml(item.mark) + '</span><span class="result-title">' + escapeHtml(item.title) + '</span><span class="result-snippet">' + makeSnippet(item.text, item.pos, term) + "</span></a></li>";
    }).join("") + "</ul>";
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener("input", render);
  input.addEventListener("focus", render);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      const first = $("a", panel);
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === "Enter") {
      const first = $("a", panel);
      if (first) {
        event.preventDefault();
        first.click();
      }
    }
  });

  panel.addEventListener("keydown", (event) => {
    const links = $$("a", panel);
    const current = links.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      input.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      (links[current + 1] || links[0]).focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      (links[current - 1] || links[links.length - 1]).focus();
    }
  });

  panel.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    const id = (link.getAttribute("href") || "").slice(1);
    close();
    input.value = "";

    const target = id ? document.getElementById(id) : null;
    const heading = target ? target.querySelector("h1, h2") : null;
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      window.setTimeout(() => heading.focus({ preventScroll: true }), 0);
    }
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) close();
  });
})();

/* ---------- Progres belajar ---------- */

(function initProgress() {
  const namespace = moduleNamespace();
  const progressKey = namespace + ".progress.v1";
  const quizKey = namespace + ".quiz.v1";
  const passScore = Number(document.documentElement.dataset.quizPass || 16);

  const tracked = $$('main section[data-track="true"]');
  const done = new Set();
  const saved = store.get(progressKey, []);
  if (Array.isArray(saved)) saved.forEach((id) => done.add(String(id)));

  const bestQuiz = Number(store.get(quizKey, 0)) || 0;
  if (bestQuiz >= passScore) done.add("uji");

  const navLinks = $$(".nav-link");
  const navItems = navLinks.map((link) => ({
    link,
    el: document.getElementById(link.dataset.nav)
  })).filter((item) => item.el);

  const order = navItems.map((item) => ({
    id: item.el.id,
    title: item.el.dataset.title || item.link.textContent.trim()
  }));

  const render = () => {
    const total = tracked.length;
    const count = tracked.filter((section) => done.has(section.dataset.chapter)).length;
    const percent = total ? Math.round((count / total) * 100) : 0;

    const text = $("#progress-text");
    const track = $("#progress-track");
    if (text) text.textContent = count + " dari " + total;

    if (track) {
      if (track.tagName === "PROGRESS") {
        track.max = total;
        track.value = count;
        track.textContent = count + " dari " + total;
      } else {
        const fill = $("#progress-fill");
        if (fill) fill.style.width = percent + "%";
        track.setAttribute("aria-valuemax", String(total));
        track.setAttribute("aria-valuenow", String(count));
        track.setAttribute("aria-valuetext", count + " dari " + total + " bab selesai");
      }
    }

    navLinks.forEach((link) => {
      link.classList.toggle("is-done", done.has(link.dataset.nav));
    });

    $$("[data-complete]").forEach((button) => {
      const complete = done.has(button.dataset.complete);
      button.setAttribute("aria-pressed", complete ? "true" : "false");
      const label = $(".complete-text", button);
      if (label) label.textContent = complete ? "Selesai, klik untuk batalkan" : "Tandai bab selesai";
    });
  };

  const setDone = (id, complete, announce) => {
    if (complete) done.add(id);
    else done.delete(id);
    store.set(progressKey, Array.from(done));
    render();
    if (announce) toast(complete ? "Bab ditandai selesai." : "Tanda selesai dibatalkan.");
  };

  for (const section of tracked) {
    const host = $("[data-chapter-end]", section);
    if (!host) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "complete-btn";
    button.dataset.complete = section.dataset.chapter;
    button.innerHTML = '<span class="box" aria-hidden="true"></span><span class="complete-text">Tandai bab selesai</span>';
    button.addEventListener("click", () => {
      setDone(section.dataset.chapter, !done.has(section.dataset.chapter), true);
    });

    const links = document.createElement("div");
    links.className = "chapter-links";

    const position = order.findIndex((item) => item.id === section.id);
    const previous = position > 0 ? order[position - 1] : null;
    const next = position >= 0 && position < order.length - 1 ? order[position + 1] : null;

    if (previous) {
      const a = document.createElement("a");
      a.className = "prev";
      a.href = "#" + previous.id;
      a.innerHTML = '<span class="dir">Sebelumnya</span><span class="name">' + escapeHtml(previous.title) + "</span>";
      links.appendChild(a);
    } else {
      links.appendChild(document.createElement("span"));
    }

    if (next) {
      const a = document.createElement("a");
      a.className = "next";
      a.href = "#" + next.id;
      a.innerHTML = '<span class="dir">Berikutnya</span><span class="name">' + escapeHtml(next.title) + "</span>";
      links.appendChild(a);
    } else {
      links.appendChild(document.createElement("span"));
    }

    const foot = document.createElement("div");
    foot.className = "chapter-foot";
    foot.appendChild(button);
    foot.appendChild(links);
    host.appendChild(foot);
  }

  render();
  window.setProgressDone = setDone;
  window.getProgressDone = () => done;
})();

/* ---------- Daftar isi dan penanda bab aktif ---------- */

(function initNavigation() {
  const navLinks = $$(".nav-link");
  const navItems = navLinks.map((link) => ({
    link,
    el: document.getElementById(link.dataset.nav)
  })).filter((item) => item.el);

  const tocNav = $("#toc-nav");
  let activeSection = null;
  let tocLinks = [];

  const slug = (text, fallback) => {
    const value = String(text).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return value || fallback;
  };

  const renderToc = (section) => {
    if (!tocNav) return;
    tocNav.innerHTML = "";
    tocLinks = [];

    const headings = $$("h3", section).filter((heading) => !heading.closest(".lab"));
    if (!headings.length) {
      tocNav.innerHTML = '<span class="toc-empty">Tidak ada subbagian di sini.</span>';
      return;
    }

    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = section.id + "-" + slug(heading.textContent, "bagian-" + (index + 1));
      const link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent.replace(/\s+/g, " ").trim();
      link.dataset.target = heading.id;
      tocNav.appendChild(link);
      tocLinks.push({ link, heading });
    });
  };

  const updateTocActive = () => {
    if (!tocLinks.length) return;
    const headerHeight = ($(".site-header") || {}).offsetHeight || 0;
    const limit = headerHeight + 80;
    let current = null;
    for (const item of tocLinks) {
      if (item.heading.getBoundingClientRect().top <= limit) current = item.link;
    }
    tocLinks.forEach((item) => item.link.classList.toggle("is-active", item.link === current));
  };

  const update = () => {
    if (!navItems.length) return;
    const headerHeight = ($(".site-header") || {}).offsetHeight || 0;
    const limit = headerHeight + 92;
    let current = navItems[0];
    for (const item of navItems) {
      if (item.el.getBoundingClientRect().top <= limit) current = item;
    }

    navLinks.forEach((link) => {
      if (link === current.link) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });

    if (activeSection !== current.el) {
      activeSection = current.el;
      renderToc(activeSection);
    }

    updateTocActive();
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("hashchange", schedule);

  if (navItems.length) {
    activeSection = navItems[0].el;
    renderToc(activeSection);
    update();
  }
})();

/* ---------- Toolbar mengambang ---------- */

(function initQuickBar() {
  if (document.querySelector(".quickbar")) return;

  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  if (!navLinks.length) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reduce ? "auto" : "smooth";

  const bar = document.createElement("div");
  bar.className = "quickbar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Aksi cepat belajar");

  const panel = document.createElement("div");
  panel.className = "quickbar-panel";
  panel.id = "quickbar-panel";
  panel.hidden = true;

  const title = document.createElement("p");
  title.className = "quickbar-title";
  title.textContent = "Daftar isi";
  panel.appendChild(title);

  const list = document.createElement("nav");
  list.className = "quickbar-list";
  list.setAttribute("aria-label", "Daftar isi halaman");

  const entries = [];

  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.charAt(0) !== "#" || href.length < 2) return;

    const target = document.getElementById(href.slice(1));
    if (!target) return;

    const label = link.querySelector(".nav-label");
    const number = link.querySelector(".nav-num");
    const name = (label ? label.textContent : link.textContent).replace(/\s+/g, " ").trim();
    if (!name) return;

    const item = document.createElement("a");
    item.href = href;

    const num = document.createElement("span");
    num.className = "quickbar-num";
    num.textContent = number ? number.textContent.trim() : "";

    const text = document.createElement("span");
    text.className = "quickbar-name";
    text.textContent = name;

    item.appendChild(num);
    item.appendChild(text);
    item.addEventListener("click", () => setOpen(false));

    list.appendChild(item);
    entries.push({ link: link, item: item });
  });

  if (!entries.length) return;

  panel.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "quickbar-actions";

  const makeButton = (key, label, icon, primary) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quickbar-btn" + (primary ? " is-primary" : "");
    button.dataset.quick = key;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon + '<span class="quickbar-label">' + label + "</span>";
    actions.appendChild(button);
    return button;
  };

  const icons = {
    list: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>',
    next: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2v11M3.5 8.5L8 13l4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    up: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 14V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
  };

  const tocButton = makeButton("toc", "Daftar isi", icons.list, false);
  tocButton.setAttribute("aria-expanded", "false");
  tocButton.setAttribute("aria-controls", "quickbar-panel");

  const nextButton = makeButton("next", "Lanjut", icons.next, true);
  const topButton = makeButton("top", "Ke atas", icons.up, false);

  const setOpen = (open) => {
    panel.hidden = !open;
    tocButton.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) return;

    entries.forEach((entry) => {
      entry.item.classList.toggle("is-current", entry.link.getAttribute("aria-current") === "true");
    });
  };

  tocButton.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  const findCurrentIndex = () => {
    let index = navLinks.findIndex((link) => link.getAttribute("aria-current") === "true");
    if (index >= 0) return index;

    const header = document.querySelector(".site-header");
    const limit = (header ? header.offsetHeight : 0) + 120;

    navLinks.forEach((link, i) => {
      const href = link.getAttribute("href") || "";
      const target = href.charAt(0) === "#" ? document.getElementById(href.slice(1)) : null;
      if (target && target.getBoundingClientRect().top <= limit) index = i;
    });

    return index;
  };

  nextButton.addEventListener("click", () => {
    setOpen(false);

    const index = findCurrentIndex();
    const next = navLinks[index + 1];

    if (next) {
      const href = next.getAttribute("href") || "";
      const target = href.charAt(0) === "#" ? document.getElementById(href.slice(1)) : null;
      if (target) {
        target.scrollIntoView({ behavior: behavior, block: "start" });
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: behavior });
    toast("Kamu sudah di akhir materi. Kembali ke awal.");
  });

  topButton.addEventListener("click", () => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: behavior });
  });

  document.addEventListener("click", (event) => {
    if (panel.hidden) return;
    if (bar.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    setOpen(false);
    tocButton.focus();
  });

  bar.appendChild(panel);
  bar.appendChild(actions);
  document.body.appendChild(bar);
})();
