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
    const submit = document.getElementById("request-submit");
    const status = document.getElementById("request-status");
    const turnstileContainer = document.getElementById("turnstile-widget");
    let widgetId = null;
    let verificationToken = "";
    let sending = false;
    if (desired && [...application.options].some((option) => option.value === desired)) {
      application.value = desired;
    }
    const setStatus = (message, focus = false) => {
      status.textContent = message;
      if (focus) status.focus();
    };
    const setVerified = (token) => {
      verificationToken = token || "";
      submit.disabled = !verificationToken || sending;
      submit.textContent = verificationToken ? "Send request →" : "Complete security check to continue";
    };
    const loadTurnstile = async () => {
      setStatus("Loading security verification…");
      const configResponse = await fetch("/api/app-request", { cache: "no-store" });
      const config = await configResponse.json();
      if (!configResponse.ok || typeof config.siteKey !== "string" || !config.siteKey) {
        throw new Error("Online requests are temporarily unavailable. Please email contact@fscoretech.com.");
      }
      await new Promise((resolve, reject) => {
        if (window.turnstile) return resolve();
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Security verification could not load. Please email contact@fscoretech.com."));
        document.head.append(script);
      });
      widgetId = window.turnstile.render(turnstileContainer, {
        sitekey: config.siteKey,
        size: window.matchMedia("(max-width: 380px)").matches ? "compact" : "flexible",
        action: "app-request",
        callback: (token) => {
          setVerified(token);
          setStatus("Security check complete. Your request is ready to send.");
        },
        "expired-callback": () => {
          setVerified("");
          setStatus("Security check expired. Please complete it again.");
        },
        "error-callback": () => {
          setVerified("");
          setStatus("Security verification is unavailable. Please refresh or email contact@fscoretech.com.");
        },
      });
      setStatus("Complete the security check to enable request submission.");
    };
    loadTurnstile().catch(() => {
      setStatus("Online requests are temporarily unavailable. Please email contact@fscoretech.com.");
    });
    requestForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (sending || !requestForm.reportValidity()) return;
      if (!verificationToken) {
        setStatus("Complete the security check before sending your request.", true);
        return;
      }
      const payload = Object.fromEntries(new FormData(requestForm));
      payload.turnstileToken = verificationToken;
      sending = true;
      submit.disabled = true;
      setStatus("Sending your request securely…");
      try {
        const response = await fetch("/api/app-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || "Delivery could not be confirmed.");
        setStatus(`Your request was accepted for email delivery. Reference: ${result.reference}. FSCoreTech will review it.`, true);
        requestForm.reset();
        if (desired && [...application.options].some((option) => option.value === desired)) {
          application.value = desired;
        }
      } catch (error) {
        setStatus((error && error.message) || "Unable to submit. Email contact@fscoretech.com instead.", true);
      } finally {
        sending = false;
        if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
        setVerified("");
      }
    });
  }

})();
