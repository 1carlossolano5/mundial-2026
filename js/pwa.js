/* =====================================================================
   Mundial 2026 - Registro del Service Worker (PWA)
   Convierte el sitio en instalable y con soporte offline. Se registra
   tras 'load' para no competir con los recursos críticos de la página.
   ===================================================================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(
      (reg) => {
        // Si hay una versión nueva esperando, la activamos al instante.
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        reg.addEventListener("updatefound", () => {
          const nuevo = reg.installing;
          if (!nuevo) return;
          nuevo.addEventListener("statechange", () => {
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
              nuevo.postMessage("SKIP_WAITING");
            }
          });
        });
      },
      (err) => console.warn("[PWA] No se pudo registrar el Service Worker:", err)
    );
    // Cuando el SW nuevo toma control, recargamos una vez para servir lo último.
    let recargado = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargado) return;
      recargado = true;
      window.location.reload();
    });
  });
}

/* =====================================================================
   Botón flotante "Instalar app"
   - Android / Chrome / Edge: usa el evento beforeinstallprompt (instala de verdad).
   - iOS / Safari: no existe ese evento → muestra instrucciones (Compartir → Agregar a inicio).
   - No aparece si ya está instalada (display standalone) o si el usuario lo descartó.
   ===================================================================== */
(function initInstallButton() {
  const btn = document.getElementById("installBtn");
  const dismiss = document.getElementById("installDismiss");
  const hint = document.getElementById("installHint");
  const hintClose = document.getElementById("installHintClose");
  if (!btn) return;

  const yaInstalada =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const descartado = sessionStorage.getItem("pwaInstallDismissed") === "1";
  const ua = navigator.userAgent || "";
  const esIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPad iOS 13+
  const esSafari = /safari/i.test(ua) && !/crios|fxios|chrome|android/i.test(ua);

  let deferredPrompt = null;

  const mostrar = () => { if (!yaInstalada && !descartado) btn.hidden = false; };
  const ocultar = () => { btn.hidden = true; if (hint) hint.hidden = true; };

  // Chrome/Edge/Android: capturamos el prompt nativo y mostramos NUESTRO botón.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mostrar();
  });

  // iOS no dispara beforeinstallprompt: mostramos el botón para enseñar el paso a paso.
  if (esIOS && esSafari && !yaInstalada && !descartado) mostrar();

  btn.addEventListener("click", async (e) => {
    if (e.target === dismiss) return; // la X se maneja aparte
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      deferredPrompt = null;
      ocultar();
    } else if (hint) {
      hint.hidden = !hint.hidden; // iOS: alterna las instrucciones
    }
  });

  if (dismiss)
    dismiss.addEventListener("click", (e) => {
      e.stopPropagation();
      sessionStorage.setItem("pwaInstallDismissed", "1");
      ocultar();
    });

  if (hintClose) hintClose.addEventListener("click", () => { hint.hidden = true; });

  // Si se instala, escondemos todo.
  window.addEventListener("appinstalled", () => { deferredPrompt = null; ocultar(); });
})();
