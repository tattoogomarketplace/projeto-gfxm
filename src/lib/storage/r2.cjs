const { DeleteObjectCommand, GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function readBoundedPrefix(body, maxBytes) {
  if (body && typeof body[Symbol.asyncIterator] === "function") {
    const chunks = [];
    let total = 0;
    for await (const chunk of body) {
      const view = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      const remaining = maxBytes - total;
      if (view.byteLength >= remaining) {
        chunks.push(view.subarray(0, remaining));
        total = maxBytes;
        break;
      }
      chunks.push(view);
      total += view.byteLength;
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, truncated: total >= maxBytes };
  }

  if (body && typeof body.transformToByteArray === "function") {
    const full = await body.transformToByteArray();
    const bytes = full.subarray(0, maxBytes);
    return { bytes, truncated: full.byteLength > maxBytes };
  }

  throw new Error("Corpo do objeto do R2 não é legível.");
}

function parseContentRangeTotal(value) {
  const match = typeof value === "string" ? value.match(/^bytes\s+\d+-\d+\/(\d+)$/i) : null;
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function fetchR2ObjectPrefix(fileKey, maxBytes) {
  if (!R2_BUCKET) {
    throw new Error("R2_BUCKET_NAME não configurado.");
  }
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("Limite de leitura inválido.");
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: fileKey,
    Range: `bytes=0-${maxBytes - 1}`,
  });
  const response = await r2Client.send(command);

  if (!response.Body) {
    throw new Error("Objeto do R2 sem corpo.");
  }

  const { bytes, truncated } = await readBoundedPrefix(response.Body, maxBytes);
  return {
    body: bytes,
    contentType: response.ContentType ?? null,
    totalLength: parseContentRangeTotal(response.ContentRange),
    truncated,
  };
}

async function deleteR2Object(fileKey) {
  if (!R2_BUCKET) {
    console.warn("[r2] R2_BUCKET_NAME ausente; limpeza de objeto ignorada.");
    return;
  }
  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: fileKey }));
  } catch (error) {
    console.error("[r2] falha ao remover objeto órfão", {
      fileKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

module.exports = {
  r2Client,
  fetchR2ObjectPrefix,
  deleteR2Object,
};
