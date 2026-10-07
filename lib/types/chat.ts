export type ChatPeer = {
  id: string;
  name: string;
  role: string;
  initial: string;
  cidade: string | null;
  estado: string | null;
};

export type ChatCategoria = 'DIRECT' | 'BUDGET' | 'ORCAMENTO';

export type ChatTab = 'DIRECT' | 'BUDGET';

export type ChatMessageDto = {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  mensagem: string;
  bloqueada: boolean;
  status: string;
  categoria: ChatCategoria;
  created_at: string;
};

export type ChatConversationDto = {
  peer: ChatPeer;
  lastMessage: ChatMessageDto | null;
  unreadCount: number;
  categoria: ChatCategoria;
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

export type FlashNoteAuthorDto = {
  id: string;
  name: string;
  role: string;
  initial: string;
  cidade: string | null;
  estado: string | null;
};

export type FlashNoteDto = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  ativa: boolean;
  author: FlashNoteAuthorDto | null;
};
