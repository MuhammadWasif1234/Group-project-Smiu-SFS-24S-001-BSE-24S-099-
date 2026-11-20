// ===== SMIU Events Portal - Shared Behaviour =====
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  function getRegistrations() {
    try { return JSON.parse(localStorage.getItem("smiuRegistrations")) || []; }
    catch (e) { return []; }
  }
  function saveRegistration(reg) {
    try {
      const all = getRegistrations();
      all.push(reg);
      localStorage.setItem("smiuRegistrations", JSON.stringify(all));
    } catch (e) { /* storage unavailable - ignore */ }
  }

  // ---------- Mobile navigation ----------
  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    $$("a", links).forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
  }

  // ---------- Event card markup ----------
  function eventCard(ev) {
    return `
      <article class="card">
        <div class="card-top" style="background:${ev.color}" aria-hidden="true">${ev.icon}</div>
        <div class="card-body">
          <span class="tag">${esc(ev.category)}</span>
          <h3>${esc(ev.title)}</h3>
          <div class="meta">
            <span>📅 ${fmtDate(ev.date)}</span>
            <span>🕒 ${esc(ev.time)}</span>
            <span>📍 ${esc(ev.venue)}</span>
          </div>
          <p>${esc(ev.desc)}</p>
          <button class="btn btn-green btn-sm" data-register="${ev.id}">Register</button>
        </div>
      </article>`;
  }

  // ---------- Home page ----------
  const homeEvents = $("#home-events");
  if (homeEvents) {
    homeEvents.innerHTML = EVENTS.slice(0, 3).map(ev => eventCard(ev).replace(
      /<button[^>]*>Register<\/button>/,
      `<a class="btn btn-green btn-sm" href="events.html#event-${ev.id}">Details &amp; Register</a>`
    )).join("");
  }
  const societyGrid = $("#society-grid");
  if (societyGrid) {
    societyGrid.innerHTML = SOCIETIES.map(s => `
      <div class="card society-card">
        <div class="society-icon" aria-hidden="true">${s.icon}</div>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.desc)}</p>
      </div>`).join("");
  }

  // ---------- Events page ----------
  const eventGrid = $("#event-grid");
  if (eventGrid) {
    let category = "All";
    let query = "";
    const empty = $("#no-events");
    const chipBox = $("#chips");

    const categories = ["All", ...new Set(EVENTS.map(e => e.category))];
    chipBox.innerHTML = categories.map((c, i) =>
      `<button class="chip${i === 0 ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");

    function render() {
      const list = EVENTS.filter(e =>
        (category === "All" || e.category === category) &&
        (e.title + e.society + e.venue + e.desc).toLowerCase().includes(query)
      );
      eventGrid.innerHTML = list.map(eventCard).join("");
      empty.style.display = list.length ? "none" : "block";
    }

    chipBox.addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      category = chip.dataset.cat;
      $$(".chip", chipBox).forEach(c => c.classList.toggle("active", c === chip));
      render();
    });
    $("#search").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); render(); });
    render();

    // Registration modal
    const backdrop = $("#modal");
    const form = $("#register-form");
    const success = $("#reg-success");
    let currentEvent = null;

    function openModal(id) {
      currentEvent = EVENTS.find(e => e.id === Number(id));
      if (!currentEvent) return;
      $("#modal-event").textContent = currentEvent.title + " · " + fmtDate(currentEvent.date);
      form.reset();
      success.classList.remove("show");
      $$(".form-group", form).forEach(g => g.classList.remove("invalid"));
      backdrop.classList.add("open");
      $("#reg-name").focus();
    }
    function closeModal() { backdrop.classList.remove("open"); }

    eventGrid.addEventListener("click", e => {
      const btn = e.target.closest("[data-register]");
      if (btn) openModal(btn.dataset.register);
    });
    $("#modal-close").addEventListener("click", closeModal);
    backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

    form.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(form);
      const name = f.get("name").trim();
      const roll = f.get("roll").trim();
      const email = f.get("email").trim();
      const dept = f.get("dept");
      const checks = {
        "reg-name": name.length >= 3,
        "reg-roll": /^[A-Za-z0-9\-\/]{4,}$/.test(roll),
        "reg-email": /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        "reg-dept": dept !== ""
      };
      let ok = true;
      Object.entries(checks).forEach(([id, valid]) => {
        $("#" + id).closest(".form-group").classList.toggle("invalid", !valid);
        if (!valid) ok = false;
      });
      if (!ok) return;
      saveRegistration({ eventId: currentEvent.id, name, roll, email, dept, at: new Date().toISOString() });
      success.textContent = `You're registered for "${currentEvent.title}", ${name}! A confirmation will be sent to ${email}.`;
      success.classList.add("show");
      form.reset();
    });

    // Deep link from home page: events.html#event-3
    const m = location.hash.match(/^#event-(\d+)$/);
    if (m) openModal(m[1]);
  }

  // ---------- Contact page ----------
  const contactForm = $("#contact-form");
  if (contactForm) {
    const notice = $("#contact-success");
    contactForm.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(contactForm);
      const checks = {
        "c-name": f.get("name").trim().length >= 3,
        "c-email": /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.get("email").trim()),
        "c-subject": f.get("subject") !== "",
        "c-message": f.get("message").trim().length >= 10
      };
      let ok = true;
      Object.entries(checks).forEach(([id, valid]) => {
        $("#" + id).closest(".form-group").classList.toggle("invalid", !valid);
        if (!valid) ok = false;
      });
      if (!ok) { notice.classList.remove("show"); return; }
      notice.textContent = "Thank you! Your message has been sent to the Student Affairs Office. We will reply within 2 working days.";
      notice.classList.add("show");
      contactForm.reset();
    });
  }

  // ---------- Footer year ----------
  const yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
