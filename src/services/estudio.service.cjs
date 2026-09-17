const { prisma } = require("./prisma.service.cjs");
const { useMockCnpj, receitaWsToken } = require("../config/env.cjs");
const { sendOtp, verifyOtp } = require("./supabase-auth.service.cjs");

const CONVITE_TTL_DIAS = 7;

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

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function convidarTatuador({ estudioUser, tatuadorId }) {
  const estudio = await prisma.perfil.findFirst({
    where: { id: estudioUser.id, deleted_at: null },
    select: { id: true, role: true },
  });

  if (!estudio || estudio.role !== "estudio") {
    throw httpError(403, "Apenas contas de estudio podem enviar convites.");
  }

  const tatuador = await prisma.perfil.findFirst({
    where: { id: tatuadorId, deleted_at: null, role: "tatuador" },
    select: { id: true, email: true, studio_id: true },
  });

  if (!tatuador) {
    throw httpError(404, "Tatuador nao encontrado.");
  }

  if (tatuador.studio_id && tatuador.studio_id !== estudio.id) {
    throw httpError(409, "Tatuador ja vinculado a outro estudio.");
  }

  const expiresAt = new Date(Date.now() + CONVITE_TTL_DIAS * 24 * 60 * 60 * 1000);

  const convite = await prisma.estudioConvite.create({
    data: {
      estudio_id: estudio.id,
      tatuador_id: tatuador.id,
      status: "pendente",
      expires_at: expiresAt,
    },
  });

  const { error: otpError } = await sendOtp(tatuador.email);
  if (otpError) {
    throw httpError(500, "Falha ao disparar OTP de vinculacao.");
  }

  return {
    sucesso: true,
    convite_id: convite.id,
    expires_at: convite.expires_at,
    ttl_dias: CONVITE_TTL_DIAS,
  };
}

async function aceitarConvite({ tatuadorUser, conviteId, otp }) {
  if (!otp || typeof otp !== "string") {
    throw httpError(400, "Codigo OTP obrigatorio.");
  }

  const { error: otpError } = await verifyOtp({ email: tatuadorUser.email, token: otp });
  if (otpError) {
    throw httpError(401, "Codigo OTP invalido ou expirado.");
  }

  return prisma.$transaction(async (tx) => {
    const agora = new Date();
    await tx.estudioConvite.updateMany({
      where: {
        status: "pendente",
        expires_at: { lte: agora },
        deleted_at: null,
      },
      data: { status: "expirado" },
    });

    const convite = await tx.estudioConvite.findFirst({
      where: {
        id: conviteId,
        tatuador_id: tatuadorUser.id,
        deleted_at: null,
      },
    });

    if (!convite) {
      throw httpError(404, "Convite nao encontrado.");
    }

    if (convite.status !== "pendente") {
      throw httpError(409, "Convite nao esta mais pendente.");
    }

    if (convite.expires_at.getTime() < agora.getTime()) {
      await tx.estudioConvite.update({
        where: { id: convite.id },
        data: { status: "expirado" },
      });
      throw httpError(410, "Convite expirado (TTL de 7 dias).");
    }

    await tx.perfil.update({
      where: { id: tatuadorUser.id },
      data: { studio_id: convite.estudio_id },
    });

    await tx.estudioTatuador.upsert({
      where: {
        estudio_id_tatuador_id: {
          estudio_id: convite.estudio_id,
          tatuador_id: tatuadorUser.id,
        },
      },
      update: { status_vinculo: "ativo", deleted_at: null },
      create: {
        estudio_id: convite.estudio_id,
        tatuador_id: tatuadorUser.id,
        status_vinculo: "ativo",
      },
    });

    const aceito = await tx.estudioConvite.update({
      where: { id: convite.id },
      data: { status: "aceito", accepted_at: agora },
    });

    return {
      sucesso: true,
      studio_id: convite.estudio_id,
      convite: aceito,
    };
  });
}

module.exports = {
  validarCnpj,
  validarCNPJMatematico,
  convidarTatuador,
  aceitarConvite,
  CONVITE_TTL_DIAS,
};
