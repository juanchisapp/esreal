/* EsReal — Lógica de la interfaz */

const els = {
  tabs: document.querySelectorAll(".tab"),
  hint: document.getElementById("hint"),
  input: document.getElementById("input"),
  checkBtn: document.getElementById("checkBtn"),
  result: document.getElementById("result"),
  chips: document.getElementById("exampleChips"),
};

let tipoActual = "link";

const HINTS = {
  link: "Pega aquí el enlace sospechoso que te llegó.",
  mensaje: "Pega el mensaje completo (SMS, WhatsApp, correo) que recibiste.",
  telefono: "Escribe el número que te llamó o te escribió.",
};

const PLACEHOLDERS = {
  link: "Ej: http://bancolombia-seguridad.xyz/verifica",
  mensaje: "Ej: Felicidades, ganaste un premio. Reclama aquí: bit.ly/...",
  telefono: "Ej: +57 300 000 0000",
};

const EJEMPLOS = {
  link: [
    { label: "Banco falso", value: "http://bancolombia-seguridad.xyz/verifica-cuenta" },
    { label: "Premio + acortador", value: "bit.ly/premio-gratis" },
    { label: "Sitio real", value: "https://www.wikipedia.org" },
  ],
  mensaje: [
    { label: "Estafa de banco", value: "URGENTE: su cuenta sera suspendida. Confirme su clave y numero de tarjeta aqui: http://nequi-seguro.top/login" },
    { label: "Premio falso", value: "Felicidades! Fuiste seleccionado ganador de un iPhone. Reclama tu premio gratis ahora: bit.ly/regalo" },
    { label: "Mensaje normal", value: "Hola, ¿nos vemos mañana a las 3 para el almuerzo?" },
  ],
  telefono: [
    { label: "Internacional raro", value: "+234 801 234 5678" },
    { label: "Número corto", value: "89012" },
    { label: "Local normal", value: "+57 310 555 4433" },
  ],
};

els.tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    els.tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    tipoActual = tab.dataset.type;
    els.hint.textContent = HINTS[tipoActual];
    els.input.placeholder = PLACEHOLDERS[tipoActual];
    els.input.value = "";
    ocultarResultado();
    renderChips();
  });
});

function renderChips() {
  els.chips.innerHTML = "";
  EJEMPLOS[tipoActual].forEach(ej => {
    const c = document.createElement("button");
    c.className = "chip";
    c.textContent = ej.label;
    c.addEventListener("click", () => {
      els.input.value = ej.value;
      revisar();
    });
    els.chips.appendChild(c);
  });
}

els.checkBtn.addEventListener("click", revisar);

function revisar() {
  const texto = els.input.value.trim();
  if (!texto) {
    els.input.focus();
    return;
  }

  els.checkBtn.disabled = true;
  els.checkBtn.innerHTML = '<span class="check-btn-icon">⏳</span> Analizando…';

  setTimeout(() => {
    const res = EsRealEngine.analizar(tipoActual, texto);
    mostrarResultado(res);
    els.checkBtn.disabled = false;
    els.checkBtn.innerHTML = '<span class="check-btn-icon">🔍</span> ¿Es seguro? Revisar ahora';
  }, 550);
}

const VERDICTS = {
  danger: { emoji: "●", title: "¡PELIGRO! Es estafa", color: "#ef4444" },
  warn:   { emoji: "🟡", title: "Cuidado, sospechoso", color: "#f59e0b" },
  safe:   { emoji: "○", title: "Parece seguro",       color: "#22c55e" },
};

function mostrarResultado(res) {
  if (!res) return;
  const v = VERDICTS[res.verdict];

  const reasonsHtml = res.reasons.map(r =>
    `<li><span class="ic">${r.ic}</span><span>${escapeHtml(r.text)}</span></li>`
  ).join("");

  els.result.className = "result " + res.verdict;
  els.result.innerHTML = `
    <div class="result-top">
      <div class="result-emoji">${v.emoji}</div>
      <div>
        <div class="result-title">${v.title}</div>
        <div class="result-sub">Nivel de riesgo: ${res.score}/100</div>
      </div>
    </div>
    <div class="risk-bar">
      <div class="risk-fill" style="width:0%; background:${v.color}"></div>
    </div>
    <ul class="reasons">${reasonsHtml}</ul>
    <div class="advice">${escapeHtml(res.advice)}</div>
  `;
  els.result.classList.remove("hidden");

  requestAnimationFrame(() => {
    const fill = els.result.querySelector(".risk-fill");
    if (fill) fill.style.width = res.score + "%";
  });
}

function ocultarResultado() {
  els.result.classList.add("hidden");
  els.result.innerHTML = "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&").replace(/</g, "&lt;").replace(/>/g, ">")
    .replace(/"/g, """).replace(/'/g, "'");
}

els.input.placeholder = PLACEHOLDERS[tipoActual];
renderChips();
