export type ArtistQuoteStatus = 'solicitado' | 'enviado' | 'aceito' | 'recusado' | 'agendado';

export type ArtistQuoteReview = {
  id: string;
  clientId: string;
  clientName: string;
  bodyPart: string | null;
  estimatedSize: string | null;
  referenceImage: string | null;
  priceRange: string | null;
  message: string;
  createdAt: string;
  quoteStatus: ArtistQuoteStatus;
};

export type ApproveQuoteResult = {
  quoteId: string;
  agendamentoId: string;
  totalValue: number;
  depositValue: number;
};
