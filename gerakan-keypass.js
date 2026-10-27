(() => {
  const salt = "39ad607a4185c169361ef889ae32acd5";
  const expectedHash = "0298e37a4f57d453adfbd24e663b440294df5366990cfede8372af4d67e483dd";
  const iterations = 210000;
  const progressView = document.currentScript?.dataset.view === "progress";
  const form = document.querySelector("#gerakanAccessForm");
  const input = document.querySelector("#gerakanKeypass");
  const submit = document.querySelector("#gerakanAccessSubmit");
  const error = document.querySelector("#gerakanAccessError");
  const access = document.querySelector("#gerakanAccess");
  const content = document.querySelector("#gerakanContent");
  let opening = false;

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Halaman belum dapat dimuat. Muat ulang lalu coba kembali."));
      document.body.appendChild(script);
    });
  }

  async function matchesKeypass(value) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(value), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({
      name: "PBKDF2", salt: encoder.encode(salt), iterations, hash: "SHA-256",
    }, key, 256);
    const hash = Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return hash === expectedHash;
  }

  input.addEventListener("input", () => {
    error.hidden = true;
    input.removeAttribute("aria-invalid");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (opening) return;
    opening = true;
    submit.disabled = true;
    submit.textContent = "Memeriksa...";
    error.hidden = true;
    form.setAttribute("aria-busy", "true");
    try {
      if (!crypto.subtle) throw new Error("Buka halaman melalui HTTPS atau localhost.");
      if (!await matchesKeypass(input.value)) {
        input.value = "";
        input.setAttribute("aria-invalid", "true");
        error.textContent = "Keypass tidak sesuai. Silakan coba kembali.";
        error.hidden = false;
        input.focus();
        return;
      }
      input.value = "";
      submit.textContent = "Membuka halaman...";
      await loadScript("sidebar.js");
      await loadScript("pkbu.js");
      await loadScript(progressView ? "gerakan-progres.js" : "gerakan-pemadanan-ui.js");
      access.hidden = true;
      content.hidden = false;
      document.querySelector("#cabangFilter")?.focus();
    } catch (cause) {
      error.textContent = cause.message || "Halaman belum dapat dibuka. Muat ulang lalu coba kembali.";
      error.hidden = false;
    } finally {
      opening = false;
      submit.disabled = false;
      submit.textContent = "Buka Halaman";
      form.removeAttribute("aria-busy");
    }
  });
})();
