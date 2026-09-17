const { Server } = require("socket.io");
const { getUserFromToken } = require("./supabase-auth.service.cjs");
const { logger } = require("../config/logger.cjs");

let io = null;

function roomForUser(userId) {
  return `user:${userId}`;
}

function attachRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const user = await getUserFromToken(token);
      if (!user) return next(new Error("Não autorizado."));
      socket.user = user;
      return next();
    } catch (err) {
      return next(err);
    }
  });

  io.on("connection", (socket) => {
    socket.join(roomForUser(socket.user.id));
    socket.emit("chat:conectado", { user_id: socket.user.id });

    socket.on("chat:entregue", async (payload) => {
      try {
        const chatService = require("./chat.service.cjs");
        const atualizado = await chatService.marcarEntregue({
          mensagemId: payload?.mensagem_id,
          userId: socket.user.id,
        });
        if (atualizado) {
          emitToUser(atualizado.remetente_id, "chat:status", {
            mensagem_id: atualizado.id,
            status: atualizado.status,
            entregue_em: atualizado.entregue_em,
          });
        }
      } catch (err) {
        logger.error({ err }, "Falha ao marcar mensagem como entregue");
      }
    });

    socket.on("chat:lido", async (payload) => {
      try {
        const chatService = require("./chat.service.cjs");
        const atualizado = await chatService.marcarLido({
          mensagemId: payload?.mensagem_id,
          userId: socket.user.id,
        });
        if (atualizado) {
          emitToUser(atualizado.remetente_id, "chat:status", {
            mensagem_id: atualizado.id,
            status: atualizado.status,
            lido_em: atualizado.lido_em,
          });
        }
      } catch (err) {
        logger.error({ err }, "Falha ao marcar mensagem como lida");
      }
    });
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(roomForUser(userId)).emit(event, payload);
}

function getIo() {
  return io;
}

module.exports = { attachRealtime, emitToUser, getIo, roomForUser };
