/* EsReal — Motor de detección anti-estafa (heurístico) */

const EsRealEngine = (() => {

  const MARCAS = [
    "bancolombia", "nequi", "daviplanta", "davivienda", "bbva", "banco",
    "nuevobanco", "paypal", "mercadopago", "mercadolibre", "amazon", "netflix",
    "whatsapp", "facebook", "instagram", "apple", "icloud", "microsoft", "google",
    "correos", "dhl", "fedex", "dian", "gobierno", "efecty", "movistar", "claro",
    "tigo", "wise", "binance", "coinbase", "western union", "moneygram"
  ];

  const ACORTADORES = [
    "bit.ly", "tinyurl.com", "goo.gl", "ow.ly", "t.co", "is.gd", "buff.ly",
    "cutt.ly", "rebrand.ly", "shorturl.at", "rb.gy", "tiny.cc", "bit.do", "soo.gd"
  ];

  const TLDS_RIESGO = [
    ".xyz", ".top", ".click", ".live", ".online", ".site", ".club", ".vip",
    ".buzz", ".rest", ".country", ".gq", ".tk", ".ml", ".cf", ".ga", ".work",
    ".support", ".cam", ".monster", ".lol", ".sbs", ".cfd"
  ];

  const URGENCIA = [
    "urgente", "inmediato", "ahora mismo", "ultima oportunidad", "última oportunidad",
    "expira", "vence hoy", "antes de", "solo por hoy", "se cerrara", "se cerrará",
    "suspendida", "bloqueada", "bloqueado", "suspendido", "cuenta sera", "cuenta será",
    "verifica ya", "actua ahora", "actúa ahora", "ultimo aviso", "último aviso",
    "tu paquete", "retenido", "no podras", "no podrás"
  ];

  const PREMIO = [
    "felicidades", "felicitaciones", "ganaste", "ganador", "premio", "sorteo",
    "has sido seleccionado", "fuiste seleccionado", "reclama", "gratis", "regalo",
    "bono", "recompensa", "loteria", "lotería", "iphone", "subsidio", "ayuda economica",
    "ayuda económica", "doble tu dinero", "inversion garantizada", "inversión garantizada",
    "rendimiento", "ganancias diarias"
  ];

  const DATOS = [
    "clave", "contraseña", "contrasena", "pin", "codigo", "código", "otp",
    "numero de tarjeta", "número de tarjeta", "cvv", "cedula", "cédula",
    "documento", "datos bancarios", "actualiza tus datos", "confirma tus datos",
    "verifica tu cuenta", "ingresa a", "inicia sesion", "inicia sesión",
    "transfiere", "consignar", "consigna", "envia el dinero", "envía el dinero",
    "pago anticipado", "deposita", "recarga"
  ];

  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  function clamp(n) { return Math.max(0, Math.min(100, n)); }

  function verdictFromScore(score) {
    if (score >= 60) return "danger";
    if (score >= 30) return "warn";
    return "safe";
  }

  function extractUrls(text) {
    const re = /((https?:\/\/)?(www\.)?[a-z0-9\-]+(\.[a-z0-9\-]+)+(\/[^\s]*)?)/gi;
    return (text.match(re) || []).filter(u => /\.[a-z]{2,}/i.test(u));
  }

  function analizarLink(raw) {
    const reasons = [];
    let score = 0;
    let url = raw.trim();
    if (!url) return null;

    if (!/^https?:\/\//i.test(url)) url = "http://" + url;

    let host = "", path = "", protocol = "http:";
    try {
      const u = new URL(url);
      host = u.hostname.toLowerCase();
      path = (u.pathname + u.search).toLowerCase();
      protocol = u.protocol;
    } catch {
      return {
        score: 50, verdict: "warn",
        reasons: [{ ic: "⚠️", text: "No parece un enlace válido. Desconfía si te lo enviaron como link." }],
        advice: "Si dudas, no hagas clic."
      };
    }

    const hostNoWww = host.replace(/^www\./, "");
    const partes = hostNoWww.split(".");
    const dominio = partes.length >= 2 ? partes.slice(-2).join(".") : hostNoWww;

    if (protocol !== "https:") {
      score += 15;
      reasons.push({ ic: "🔓", text: "No usa conexión segura (https). Un sitio serio casi siempre la tiene." });
    }

    if (ACORTADORES.some(a => hostNoWww === a || hostNoWww.endsWith("." + a))) {
      score += 35;
      reasons.push({ ic: "🕳️", text: "Es un enlace acortado: esconde la dirección real a la que te lleva." });
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostNoWww)) {
      score += 50;
      reasons.push({ ic: "🔢", text: "Usa números (IP) en vez de un nombre. Los bancos nunca hacen eso." });
    }

    if (raw.includes("@")) {
      score += 30;
      reasons.push({ ic: "🎭", text: "Contiene el símbolo @, un truco para ocultar el destino real." });
    }

    const marcaEnTexto = MARCAS.find(m => norm(hostNoWww + path).includes(norm(m)));
    const marcaEnDominio = MARCAS.find(m => norm(dominio).includes(norm(m)));
    if (marcaEnTexto && !marcaEnDominio) {
      score += 45;
      reasons.push({ ic: "🪤", text: `Menciona "${marcaEnTexto}" pero NO en su sitio oficial. Clásico engaño de suplantación.` });
    }

    if (marcaEnDominio && /[0-9\-]/.test(dominio.split(".")[0]) ) {
      score += 25;
      reasons.push({ ic: "🔍", text: "El nombre imita una marca pero tiene números o guiones extraños." });
    }

    const tld = "." + partes[partes.length - 1];
    if (TLDS_RIESGO.includes(tld)) {
      score += 20;
      reasons.push({ ic: "🌐", text: `Termina en "${tld}", una terminación barata muy usada por estafadores.` });
    }

    if (partes.length >= 5) {
      score += 15;
      reasons.push({ ic: "🧩", text: "Tiene muchísimos subdominios, suele usarse para confundir." });
    }

    if (dominio.length > 30 || (dominio.split("-").length - 1) >= 3) {
      score += 12;
      reasons.push({ ic: "📏", text: "El nombre del sitio es anormalmente largo o con muchos guiones." });
    }

    const todo = norm(raw);
    if (PREMIO.some(p => todo.includes(norm(p))) || URGENCIA.some(p => todo.includes(norm(p)))) {
      score += 18;
      reasons.push({ ic: "🎣", text: "El enlace contiene palabras de premio o urgencia (cebo típico)." });
    }

    score = clamp(score);
    if (reasons.length === 0) {
      reasons.push({ ic: "✓", text: "No detectamos señales claras de estafa en este enlace." });
    }
    return { score, verdict: verdictFromScore(score), reasons, advice: adviceFor(verdictFromScore(score)) };
  }

  function analizarMensaje(raw) {
    const text = norm(raw);
    if (!text.trim()) return null;
    const reasons = [];
    let score = 0;

    const hits = (list) => list.filter(w => text.includes(norm(w)));

    const u = hits(URGENCIA);
    if (u.length) {
      score += Math.min(28, 12 + u.length * 6);
      reasons.push({ ic: "⏰", text: `Te mete presión y urgencia ("${u[0]}"). Los estafadores te apuran para que no pienses.` });
    }

    const pr = hits(PREMIO);
    if (pr.length) {
      score += Math.min(30, 14 + pr.length * 6);
      reasons.push({ ic: "🎁", text: `Ofrece premios o dinero fácil ("${pr[0]}"). Si es demasiado bueno, es falso.` });
    }

    const d = hits(DATOS);
    if (d.length) {
      score += Math.min(38, 18 + d.length * 6);
      reasons.push({ ic: "🔑", text: `Te pide datos o dinero ("${d[0]}"). Ningún banco serio los pide por mensaje.` });
    }

    const m = MARCAS.find(x => text.includes(norm(x)));
    if (m) {
      score += 12;
      reasons.push({ ic: "🏷️", text: `Dice ser de "${m}". Verifica siempre por el canal oficial, no por este mensaje.` });
    }

    const urls = extractUrls(raw);
    if (urls.length) {
      const peor = urls
        .map(analizarLink)
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)[0];
      if (peor) {
        score += Math.round(peor.score * 0.6);
        reasons.push({ ic: "🔗", text: `Incluye un enlace con riesgo ${peor.score}/100. Revisar el link aparte es buena idea.` });
      }
    }

    if (/(\bhola\b.*\bestimado\b)|(\bsr\/sra\b)|(querido cliente)|(estimado usuario)/.test(text)) {
      score += 10;
      reasons.push({ ic: "👤", text: "Saludo genérico ('estimado cliente'). Tu banco real te llama por tu nombre." });
    }
    if (/\b\d{3,}\s?(usd|dolares|dólares|pesos|cop|eur)\b/.test(text) && (pr.length || d.length)) {
      score += 8;
      reasons.push({ ic: "💵", text: "Menciona cantidades de dinero junto con premios o pagos." });
    }

    score = clamp(score);
    if (reasons.length === 0) {
      reasons.push({ ic: "✓", text: "No detectamos señales típicas de estafa en este mensaje." });
    }
    return { score, verdict: verdictFromScore(score), reasons, advice: adviceFor(verdictFromScore(score)) };
  }

  function analizarTelefono(raw) {
    const reasons = [];
    let score = 0;
    const limpio = (raw || "").replace(/[\s\-().]/g, "");
    if (!limpio) return null;

    if (!/^\+?\d{5,15}$/.test(limpio)) {
      reasons.push({ ic: "⚠️", text: "No parece un número de teléfono normal." });
      return { score: 45, verdict: "warn", reasons, advice: adviceFor("warn") };
    }

    if (limpio.replace("+", "").length <= 6) {
      score += 32;
      reasons.push({ ic: "📨", text: "Es un número corto, típico de envíos masivos de SMS. Trátalo con cuidado." });
    }

    if (/^\+?(234|254|92|91|62|7|212|225|233)/.test(limpio)) {
      score += 30;
      reasons.push({ ic: "🌍", text: "Tiene un prefijo internacional poco común para una llamada local. Sospechoso." });
    }

    if (/(\d)\1{4,}/.test(limpio)) {
      score += 15;
      reasons.push({ ic: "🔁", text: "El número tiene dígitos muy repetidos, frecuente en líneas falsas." });
    }

    score = clamp(score);
    if (reasons.length === 0) {
      reasons.push({ ic: "ℹ️", text: "No tenemos señales de alarma, pero nunca des datos por llamada no solicitada." });
    }
    return { score, verdict: verdictFromScore(score), reasons, advice: adviceFor(verdictFromScore(score)) };
  }

  function adviceFor(verdict) {
    if (verdict === "danger") return "🚫 NO hagas clic, NO respondas y NO envíes dinero ni datos. Bloquea y elimina.";
    if (verdict === "warn")   return "🤔 Desconfía. Verifica por el canal oficial antes de hacer cualquier cosa.";
    return "+ Parece seguro, pero mantén siempre la guardia con datos y dinero.";
  }

  function analizar(tipo, texto) {
    if (tipo === "link") return analizarLink(texto);
    if (tipo === "mensaje") return analizarMensaje(texto);
    if (tipo === "telefono") return analizarTelefono(texto);
    return null;
  }

  return { analizar };
})();
