const TERMOS_PROIBIDOS_SAUDE = /\b(pomada|anestesia|anestesico|anest[eé]sico|tktx|lidoca[ií]na|emla|numbing)\b/i;

const ROTULOS_LEGAIS = {
  taxa_conforto: "Taxa de Conforto",
  sessao_sem_dor: "Sessao Sem Dor",
};

function detectarTermoSaude(texto) {
  if (!texto || typeof texto !== "string") return null;
  const match = texto.match(TERMOS_PROIBIDOS_SAUDE);
  return match ? match[0] : null;
}

function rotuloLegalParaExtra(descricao) {
  const termo = detectarTermoSaude(descricao);
  if (!termo) return { bloqueado: false, descricao, termo: null };

  const normalizado = termo.toLowerCase();
  const descricaoLegal =
    normalizado.includes("tktx") || normalizado.includes("anest") || normalizado.includes("lidoc") || normalizado.includes("emla") || normalizado.includes("numbing")
      ? ROTULOS_LEGAIS.sessao_sem_dor
      : ROTULOS_LEGAIS.taxa_conforto;

  return { bloqueado: true, descricao: descricaoLegal, termo };
}

function sanitizarExtras(extras) {
  if (!Array.isArray(extras)) return { extrasLegais: [], bloqueios: [] };

  const extrasLegais = [];
  const bloqueios = [];

  for (const extra of extras) {
    const descricao = typeof extra?.descricao === "string" ? extra.descricao : "";
    const valor = Number(extra?.valor || 0);
    const resultado = rotuloLegalParaExtra(descricao);

    if (resultado.bloqueado) {
      bloqueios.push({
        original: descricao,
        termo: resultado.termo,
        rotulo_legal: resultado.descricao,
      });
      extrasLegais.push({
        descricao: resultado.descricao,
        valor: valor > 0 ? valor : 0,
      });
    } else if (descricao.trim()) {
      extrasLegais.push({
        descricao: descricao.trim(),
        valor: valor > 0 ? valor : 0,
      });
    }
  }

  return { extrasLegais, bloqueios };
}

module.exports = {
  TERMOS_PROIBIDOS_SAUDE,
  ROTULOS_LEGAIS,
  detectarTermoSaude,
  rotuloLegalParaExtra,
  sanitizarExtras,
};
