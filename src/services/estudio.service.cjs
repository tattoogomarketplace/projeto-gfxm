const { prisma } = require("./prisma.service.cjs");
const { useMockCnpj, receitaWsToken } = require("../config/env.cjs");

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

function maskCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 14) return null;
  return `**.***.***/${digits.slice(8, 12)}-**`;
}

function isVerifiedStudio(row) {
  if (row.kyc_status === "aprovado") return true;
  const status = String(row.estudioCompliance?.status_receita || "").toLowerCase();
  return status.includes("ativ");
}

function toStudioCard(row) {
  const razaoSocial = row.estudioCompliance?.razao_social || null;
  return {
    id: row.id,
    nome: row.nome || razaoSocial || "Estúdio",
    cidade: row.cidade,
    estado: row.estado,
    razaoSocial,
    cnpjMasked: maskCnpj(row.estudioCompliance?.cnpj),
    verified: isVerifiedStudio(row),
  };
}

const ESTUDIO_SELECT = {
  id: true,
  nome: true,
  cidade: true,
  estado: true,
  kyc_status: true,
  estudioCompliance: {
    select: { razao_social: true, cnpj: true, status_receita: true },
  },
};

async function expireStaleInvites() {
  await prisma.estudioConvite.updateMany({
    where: {
      status: "pendente",
      expires_at: { lte: new Date() },
      deleted_at: null,
    },
    data: { status: "expirado" },
  });
}

async function buscarEstudiosVerificados(query) {
  const q = String(query || "").trim().slice(0, 80);
  const rows = await prisma.perfil.findMany({
    where: {
      role: "estudio",
      deleted_at: null,
      AND: [
        {
          OR: [
            { kyc_status: "aprovado" },
            {
              estudioCompliance: {
                is: {
                  deleted_at: null,
                  status_receita: { contains: "ativ", mode: "insensitive" },
                },
              },
            },
          ],
        },
        ...(q
          ? [
              {
                OR: [
                  { nome: { contains: q, mode: "insensitive" } },
                  { cidade: { contains: q, mode: "insensitive" } },
                  { estado: { contains: q, mode: "insensitive" } },
                  {
                    estudioCompliance: {
                      is: { razao_social: { contains: q, mode: "insensitive" } },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    select: ESTUDIO_SELECT,
    orderBy: { nome: "asc" },
    take: 20,
  });
  return rows.filter(isVerifiedStudio).map(toStudioCard);
}

async function solicitarAfiliacao({ tatuadorUser, estudioId }) {
  if (!estudioId) throw httpError(400, "Estúdio inválido.");

  const [tatuador, estudio] = await Promise.all([
    prisma.perfil.findFirst({
      where: { id: tatuadorUser.id, deleted_at: null, role: "tatuador" },
      select: { id: true, studio_id: true },
    }),
    prisma.perfil.findFirst({
      where: { id: estudioId, deleted_at: null, role: "estudio" },
      select: ESTUDIO_SELECT,
    }),
  ]);

  if (!tatuador) throw httpError(404, "Perfil de tatuador não encontrado.");
  if (!estudio || !isVerifiedStudio(estudio)) {
    throw httpError(404, "Estúdio não encontrado ou ainda não verificado.");
  }
  if (tatuador.studio_id) throw httpError(409, "Você já está vinculado a um estúdio.");

  await expireStaleInvites();

  const existing = await prisma.estudioConvite.findFirst({
    where: {
      estudio_id: estudio.id,
      tatuador_id: tatuador.id,
      status: "pendente",
      deleted_at: null,
    },
    select: { id: true, expires_at: true },
  });
  if (existing) {
    return { convite_id: existing.id, expires_at: existing.expires_at, reused: true };
  }

  const convite = await prisma.estudioConvite.create({
    data: {
      estudio_id: estudio.id,
      tatuador_id: tatuador.id,
      status: "pendente",
      expires_at: new Date(Date.now() + CONVITE_TTL_DIAS * 24 * 60 * 60 * 1000),
    },
    select: { id: true, expires_at: true },
  });
  return { convite_id: convite.id, expires_at: convite.expires_at, reused: false };
}

async function listarAfiliacao({ user }) {
  await expireStaleInvites();

  if (user.role === "tatuador") {
    const tatuador = await prisma.perfil.findFirst({
      where: { id: user.id, deleted_at: null },
      select: { studio: { select: ESTUDIO_SELECT } },
    });
    const pedidos = await prisma.estudioConvite.findMany({
      where: { tatuador_id: user.id, deleted_at: null },
      select: {
        id: true,
        status: true,
        expires_at: true,
        created_at: true,
        estudio: { select: ESTUDIO_SELECT },
      },
      orderBy: { created_at: "desc" },
      take: 30,
    });
    return {
      role: "tatuador",
      vinculo: tatuador?.studio ? toStudioCard(tatuador.studio) : null,
      pedidos: pedidos.map((item) => ({
        id: item.id,
        status: item.status,
        expires_at: item.expires_at,
        created_at: item.created_at,
        estudio: toStudioCard(item.estudio),
      })),
    };
  }

  if (user.role === "estudio") {
    const [pedidos, artistas, compliance] = await Promise.all([
      prisma.estudioConvite.findMany({
        where: { estudio_id: user.id, deleted_at: null },
        select: {
          id: true,
          status: true,
          expires_at: true,
          created_at: true,
          tatuador: {
            select: { id: true, nome: true, cidade: true, estado: true, kyc_status: true },
          },
        },
        orderBy: { created_at: "desc" },
        take: 50,
      }),
      prisma.estudioTatuador.findMany({
        where: { estudio_id: user.id, status_vinculo: "ativo", deleted_at: null },
        select: {
          tatuador: {
            select: { id: true, nome: true, cidade: true, estado: true, kyc_status: true },
          },
        },
        take: 100,
      }),
      prisma.estudioCompliance.findFirst({
        where: { id: user.id, deleted_at: null },
        select: {
          cnpj: true,
          razao_social: true,
          endereco_oficial: true,
          status_receita: true,
        },
      }),
    ]);

    return {
      role: "estudio",
      pendentes: pedidos.filter((item) => item.status === "pendente"),
      pedidos,
      artistas: artistas.map((item) => ({
        id: item.tatuador.id,
        nome: item.tatuador.nome || "Artista",
        cidade: item.tatuador.cidade,
        estado: item.tatuador.estado,
        kyc_status: item.tatuador.kyc_status,
      })),
      compliance: compliance
        ? {
            cnpjMasked: maskCnpj(compliance.cnpj),
            razaoSocial: compliance.razao_social,
            enderecoOficial: compliance.endereco_oficial,
            statusReceita: compliance.status_receita,
          }
        : null,
    };
  }

  throw httpError(403, "Afiliação disponível apenas para tatuadores e estúdios.");
}

async function decidirAfiliacao({ user, conviteId, action }) {
  if (!conviteId) throw httpError(400, "Pedido inválido.");
  if (!["accept", "reject", "cancel"].includes(action)) {
    throw httpError(400, "Ação inválida.");
  }

  await expireStaleInvites();

  return prisma.$transaction(async (tx) => {
    const convite = await tx.estudioConvite.findFirst({
      where: { id: conviteId, deleted_at: null },
    });
    if (!convite) throw httpError(404, "Pedido não encontrado.");
    if (convite.status !== "pendente") throw httpError(409, "Pedido não está mais pendente.");

    const isStudio = user.role === "estudio" && convite.estudio_id === user.id;
    const isArtist = user.role === "tatuador" && convite.tatuador_id === user.id;

    if (action === "cancel") {
      if (!isArtist) throw httpError(403, "Apenas o artista pode cancelar este pedido.");
      const canceled = await tx.estudioConvite.update({
        where: { id: convite.id },
        data: { status: "recusado" },
      });
      return { sucesso: true, status: canceled.status };
    }

    if (!isStudio) {
      throw httpError(403, "Apenas o estúdio destino pode decidir este pedido.");
    }

    if (action === "reject") {
      const rejected = await tx.estudioConvite.update({
        where: { id: convite.id },
        data: { status: "recusado" },
      });
      return { sucesso: true, status: rejected.status };
    }

    const tatuador = await tx.perfil.findFirst({
      where: { id: convite.tatuador_id, deleted_at: null },
      select: { id: true, studio_id: true, role: true },
    });
    if (!tatuador || tatuador.role !== "tatuador") {
      throw httpError(404, "Tatuador não encontrado.");
    }
    if (tatuador.studio_id && tatuador.studio_id !== convite.estudio_id) {
      throw httpError(409, "Tatuador já vinculado a outro estúdio.");
    }

    await tx.perfil.update({
      where: { id: tatuador.id },
      data: { studio_id: convite.estudio_id },
    });

    await tx.estudioTatuador.upsert({
      where: {
        estudio_id_tatuador_id: {
          estudio_id: convite.estudio_id,
          tatuador_id: tatuador.id,
        },
      },
      update: { status_vinculo: "ativo", deleted_at: null },
      create: {
        estudio_id: convite.estudio_id,
        tatuador_id: tatuador.id,
        status_vinculo: "ativo",
      },
    });

    await tx.estudioConvite.updateMany({
      where: {
        tatuador_id: tatuador.id,
        status: "pendente",
        id: { not: convite.id },
        deleted_at: null,
      },
      data: { status: "expirado" },
    });

    const accepted = await tx.estudioConvite.update({
      where: { id: convite.id },
      data: { status: "aceito", accepted_at: new Date() },
    });

    return { sucesso: true, status: accepted.status, studio_id: convite.estudio_id };
  });
}

module.exports = {
  validarCnpj,
  validarCNPJMatematico,
  convidarTatuador,
  aceitarConvite,
  buscarEstudiosVerificados,
  solicitarAfiliacao,
  listarAfiliacao,
  decidirAfiliacao,
  CONVITE_TTL_DIAS,
};
