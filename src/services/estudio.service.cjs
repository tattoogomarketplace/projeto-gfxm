const { prisma } = require("./prisma.service.cjs");
const { useMockCnpj, receitaWsToken } = require("../config/env.cjs");

function validarCNPJMatematico(cnpj) {
  cnpj = cnpj.replace(/[^\d]+/g, "");
  if (cnpj.length !== 14) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado == digitos.charAt(1);
}

async function persistirCompliance({ userId, cnpj, razaoSocial, enderecoOficial, statusReceita }) {
  await prisma.estudioCompliance.upsert({
    where: { id: userId },
    update: {
      cnpj,
      razao_social: razaoSocial,
      endereco_oficial: enderecoOficial,
      status_receita: statusReceita,
    },
    create: {
      id: userId,
      cnpj,
      razao_social: razaoSocial,
      endereco_oficial: enderecoOficial,
      status_receita: statusReceita,
    },
  });

  await prisma.perfil.update({
    where: { id: userId },
    data: { cnpj },
  });
}

async function validarCnpj({ cnpj, userId }) {
  const cnpjLimpo = cnpj.replace(/[^\d]+/g, "");
  if (!validarCNPJMatematico(cnpjLimpo)) {
    const error = new Error("Formato de CNPJ inválido.");
    error.status = 400;
    throw error;
  }

  if (useMockCnpj) {
    console.log(`[CNPJ MOCK] Validado sintaticamente: ${cnpjLimpo} para user: ${userId}`);
    await persistirCompliance({
      userId,
      cnpj: cnpjLimpo,
      razaoSocial: "Estudio Mock",
      enderecoOficial: null,
      statusReceita: "ativa",
    });
    return { sucesso: true, status: "validado_mock" };
  }

  const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${receitaWsToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log(`[DEBUG RECEITAWS] Resposta para CNPJ ${cnpjLimpo}:`, JSON.stringify(data, null, 2));

  if (data.status === "ERROR") {
    const error = new Error("CNPJ não encontrado ou indisponível.");
    error.status = 400;
    throw error;
  }

  if (data.situacao !== "ATIVA") {
    const error = new Error(`Cadastro inválido: Situação ${data.situacao}.`);
    error.status = 403;
    throw error;
  }

  await persistirCompliance({
    userId,
    cnpj: cnpjLimpo,
    razaoSocial: data.nome,
    enderecoOficial: `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio}/${data.uf}`,
    statusReceita: "ativa",
  });

  return {
    sucesso: true,
    razao_social: data.nome,
    status: "ativo_confirmado_e_registrado",
  };
}

module.exports = { validarCnpj, validarCNPJMatematico };
