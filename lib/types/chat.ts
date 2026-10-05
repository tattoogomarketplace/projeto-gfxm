export type ChatPeer = {
  id: string;
  name: string;
  role: string;
  initial: string;
  cidade: string | null;
  estado: string | null;
};

export type ChatMessageDto = {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  mensagem: string;
  bloqueada: boolean;
  status: string;
  created_at: string;
};

export type ChatConversationDto = {
  peer: ChatPeer;
  lastMessage: ChatMessageDto | null;
  unreadCount: number;
};

export type ChatArtworkRef = {
  id: string;
  tatuadorId: string;
  imageUrl: string;
  style: string;
  bodyPart: string;
  sessionDuration: string;
  isHealed: boolean;
  descricao: string | null;
};

export type ChatContextDto = {
  peer: ChatPeer;
  artwork: ChatArtworkRef | null;
};
