export type StudioCard = {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  razaoSocial: string | null;
  cnpjMasked: string | null;
  verified: boolean;
};

export type StudioArtistRow = {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  kyc_status: string;
};

export type StudioComplianceView = {
  cnpjMasked: string | null;
  razaoSocial: string | null;
  enderecoOficial: string | null;
  statusReceita: string | null;
  updatedAt?: string;
} | null;
