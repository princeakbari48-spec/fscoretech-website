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
      (cfg.contactEmail || "contact@fscoretech.com") +
      "?subject=" +
      subject +
      "&body=" +
      body;
  });
  const requestForm = document.getElementById("app-request-form");
  if (requestForm) {
    const application = requestForm.querySelector("[name=application]");
    const desired = new URLSearchParams(location.search).get("app");
    if (desired && [...application.options].some(o => o.value === desired)) application.value = desired;
    requestForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!requestForm.reportValidity()) return;
      const submit = document.getElementById("request-submit");
      const status = document.getElementById("request-status");
      const payload = Object.fromEntries(new FormData(requestForm));
      submit.disabled = true;
      status.textContent = "Sending your request…";
      try {
        const response = await fetch("/api/app-request", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        const result = await response.json();
        if (!response.ok || !result.ok) throw Error(result.error || "Delivery could not be confirmed.");
        status.textContent = "Your request was sent successfully. FSCoreTech will review it.";
        requestForm.reset();
      } catch (error) {
        status.textContent = (error && error.message) || "Unable to submit. Email contact@fscoretech.com instead.";
      } finally {
        submit.disabled = false;
      }
    });
  }

})();
