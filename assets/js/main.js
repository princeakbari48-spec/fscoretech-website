(function () {
  const cfg = window.FSCORE_CONFIG || {};
  document.querySelectorAll("[data-github]").forEach((a) => {
    if (cfg.githubUrl) a.href = cfg.githubUrl;
  });
  document.querySelectorAll("[data-email]").forEach((a) => {
    if (cfg.contactEmail) {
      a.href = "mailto:" + cfg.contactEmail;
      a.textContent = cfg.contactEmail;
    }
  });
  const btn = document.querySelector(".menu-btn"),
    links = document.querySelector(".navlinks");
  function close() {
    links.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }
  if (btn && links) {
    btn.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (e) => {
      if (e.target.closest("a")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && links.classList.contains("open")) {
        close();
        btn.focus();
      }
    });
  }
  document
    .querySelectorAll("[data-year]")
    .forEach((el) => (el.textContent = new Date().getFullYear()));
  document.getElementById("compose")?.addEventListener("click", () => {
    const subject = encodeURIComponent(
      document.getElementById("subject").value,
    );
    const body = encodeURIComponent(document.getElementById("message").value);
    location.href =
      "mailto:" +
      (cfg.contactEmail || "fsp@fscoretech.com") +
      "?subject=" +
      subject +
      "&body=" +
      body;
  });
})();
