const REVIEW_FEATURED_ARTISTS = {
  marina: {
    id: "ph-marina",
    name: "Marina Costa",
    username: "marina_costa",
    role: "tatuador",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop",
    initial: "M",
  },
  rafael: {
    id: "ph-rafael",
    name: "Rafael Lima",
    username: "rafael_lima",
    role: "tatuador",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop",
    initial: "R",
  },
  bianca: {
    id: "ph-bianca",
    name: "Bianca Souza",
    username: "bianca_souza",
    role: "tatuador",
    avatarUrl:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop",
    initial: "B",
  },
  diego: {
    id: "ph-diego",
    name: "Diego Martins",
    username: "diego_martins",
    role: "tatuador",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop",
    initial: "D",
  },
  camila: {
    id: "ph-camila",
    name: "Camila Rocha",
    username: "camila_rocha",
    role: "tatuador",
    avatarUrl:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=240&q=80&auto=format&fit=crop",
    initial: "C",
  },
  lucas: {
    id: "ph-lucas",
    name: "Lucas Ferreira",
    username: "lucas_ferreira",
    role: "tatuador",
    avatarUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&q=80&auto=format&fit=crop",
    initial: "L",
  },
};

const FEATURED_ARTIST_GEO = {
  marina: {
    latitude: -23.54648,
    longitude: -46.69112,
    address: { street: "Rua Harmonia, 412", city: "São Paulo", state: "SP", zip: "05435-000" },
  },
  rafael: {
    latitude: -23.56141,
    longitude: -46.65588,
    address: { street: "Rua Augusta, 1508", city: "São Paulo", state: "SP", zip: "01304-001" },
  },
  bianca: {
    latitude: -23.60192,
    longitude: -46.67248,
    address: { street: "Av. Ibirapuera, 3103", city: "São Paulo", state: "SP", zip: "04029-200" },
  },
  diego: {
    latitude: -23.55821,
    longitude: -46.63472,
    address: { street: "Rua da Glória, 266", city: "São Paulo", state: "SP", zip: "01510-000" },
  },
  camila: {
    latitude: -23.58562,
    longitude: -46.67391,
    address: { street: "Rua Joaquim Floriano, 466", city: "São Paulo", state: "SP", zip: "04534-002" },
  },
  lucas: {
    latitude: -23.57318,
    longitude: -46.64192,
    address: { street: "Rua da Consolação, 2423", city: "São Paulo", state: "SP", zip: "01301-100" },
  },
};

const AUTHORS = {
  ana: {
    id: "ph-client-ana",
    name: "Ana Beatriz",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&q=80&auto=format&fit=crop",
    initial: "A",
  },
  joao: {
    id: "ph-client-joao",
    name: "João Pedro",
    avatarUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&q=80&auto=format&fit=crop",
    initial: "J",
  },
  leticia: {
    id: "ph-client-leticia",
    name: "Letícia Alves",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80&auto=format&fit=crop",
    initial: "L",
  },
  henrique: {
    id: "ph-client-henrique",
    name: "Henrique Souza",
    avatarUrl: null,
    initial: "H",
  },
  carolina: {
    id: "ph-client-carolina",
    name: "Carolina Mendes",
    avatarUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=240&q=80&auto=format&fit=crop",
    initial: "C",
  },
  bruno: {
    id: "ph-client-bruno",
    name: "Bruno Teixeira",
    avatarUrl: null,
    initial: "B",
  },
};

const PORTFOLIOS = {
  fineLine: {
    id: "ph-i2",
    imageUrl:
      "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80&auto=format&fit=crop",
    style: "Fine Line",
  },
  realismo: {
    id: "ph-i1",
    imageUrl:
      "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=80&auto=format&fit=crop",
    style: "Realismo",
  },
  blackwork: {
    id: "ph-i3",
    imageUrl:
      "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800&q=80&auto=format&fit=crop",
    style: "Blackwork",
  },
  oldSchool: {
    id: "ph-i4",
    imageUrl:
      "https://images.unsplash.com/photo-1542727365-19732a80dcfd?w=800&q=80&auto=format&fit=crop",
    style: "Old School",
  },
  minimalista: {
    id: "ph-i5",
    imageUrl:
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80&auto=format&fit=crop",
    style: "Minimalista",
  },
  oriental: {
    id: "ph-i9",
    imageUrl:
      "https://images.unsplash.com/photo-1595475207225-428b62bda831?w=800&q=80&auto=format&fit=crop",
    style: "Oriental",
  },
};

const PLACEHOLDER_INSPIRATIONS = [
  {
    id: "ph-i1",
    imageUrl: "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=80&auto=format&fit=crop",
    style: "Realismo",
    artistName: "Rafael Lima",
    artistId: "ph-rafael",
    artistUsername: "rafael_lima",
    likes: 3556,
    viewsCount: 12840,
    location: "São Paulo/SP",
    description: "Realismo em pele, luz e sombra no detalhe.",
  },
  {
    id: "ph-i2",
    imageUrl: "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80&auto=format&fit=crop",
    style: "Fine Line",
    artistName: "Marina Costa",
    artistId: "ph-marina",
    artistUsername: "marina_costa",
    likes: 2418,
    viewsCount: 8732,
    location: "Rio de Janeiro/RJ",
    description: "Fine line delicada, traço limpo e contínuo.",
  },
  {
    id: "ph-i3",
    imageUrl: "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800&q=80&auto=format&fit=crop",
    style: "Blackwork",
    artistName: "Bianca Souza",
    artistId: "ph-bianca",
    artistUsername: "bianca_souza",
    likes: 4190,
    viewsCount: 15601,
    location: "Belo Horizonte/MG",
    description: "Blackwork fechado, contraste alto e preenchimento sólido.",
  },
  {
    id: "ph-i4",
    imageUrl: "https://images.unsplash.com/photo-1542727365-19732a80dcfd?w=800&q=80&auto=format&fit=crop",
    style: "Old School",
    artistName: "Diego Martins",
    artistId: "ph-diego",
    artistUsername: "diego_martins",
    likes: 1876,
    viewsCount: 6420,
    location: "Curitiba/PR",
    description: "Old school clássica, cores chapadas e contorno firme.",
  },
  {
    id: "ph-i5",
    imageUrl: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80&auto=format&fit=crop",
    style: "Minimalista",
    artistName: "Camila Rocha",
    artistId: "ph-camila",
    artistUsername: "camila_rocha",
    likes: 2964,
    viewsCount: 10112,
    location: "Florianópolis/SC",
    description: "Minimalista, poucos traços e muita intenção.",
  },
  {
    id: "ph-i6",
    imageUrl: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80&auto=format&fit=crop",
    style: "Geometrico",
    artistName: "Lucas Ferreira",
    artistId: "ph-lucas",
    artistUsername: "lucas_ferreira",
    likes: 1632,
    viewsCount: 4988,
    location: "Porto Alegre/RS",
    description: "Geometria simétrica, ritmo e precisão no encaixe.",
  },
  {
    id: "ph-i7",
    imageUrl: "https://images.unsplash.com/photo-1560707854-fb9a10eeaace?w=800&q=80&auto=format&fit=crop",
    style: "Aquarela",
    artistName: "Marina Costa",
    artistId: "ph-marina",
    artistUsername: "marina_costa",
    likes: 1489,
    viewsCount: 4210,
    location: "Rio de Janeiro/RJ",
    description: "Aquarela com transições suaves e bordas abertas.",
  },
  {
    id: "ph-i8",
    imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80&auto=format&fit=crop",
    style: "Lettering",
    artistName: "Diego Martins",
    artistId: "ph-diego",
    artistUsername: "diego_martins",
    likes: 2210,
    viewsCount: 7804,
    location: "Curitiba/PR",
    description: "Lettering com peso, ritmo e leitura imediata.",
  },
  {
    id: "ph-i9",
    imageUrl: "https://images.unsplash.com/photo-1595475207225-428b62bda831?w=800&q=80&auto=format&fit=crop",
    style: "Oriental",
    artistName: "Bianca Souza",
    artistId: "ph-bianca",
    artistUsername: "bianca_souza",
    likes: 5021,
    viewsCount: 18440,
    location: "Belo Horizonte/MG",
    description: "Oriental com fluxo, escala e encaixe no corpo.",
  },
  {
    id: "ph-i10",
    imageUrl: "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=800&q=80&auto=format&fit=crop",
    style: "Realismo",
    artistName: "Rafael Lima",
    artistId: "ph-rafael",
    artistUsername: "rafael_lima",
    likes: 2744,
    viewsCount: 9655,
    location: "São Paulo/SP",
    description: "Retrato em realismo, textura de pele e profundidade.",
  },
];

const PLACEHOLDER_REVIEWS = [
  {
    id: "ph-rev-1",
    authorId: AUTHORS.ana.id,
    targetId: REVIEW_FEATURED_ARTISTS.marina.id,
    portfolioId: PORTFOLIOS.fineLine.id,
    rating: 5,
    content:
      "Fine line impecável. A Marina explicou cada traço, respeitou o espaço do pulso e a cicatrização veio limpa em duas semanas.",
    artistReply:
      "Obrigada, Ana. Fico feliz que o pulso tenha cicatrizado tão bem — qualquer retoque, é só chamar.",
    repliedAt: "2026-09-18T14:20:00.000Z",
    isVerified: true,
    createdAt: "2026-09-12T16:40:00.000Z",
    author: AUTHORS.ana,
    target: REVIEW_FEATURED_ARTISTS.marina,
    portfolio: PORTFOLIOS.fineLine,
  },
  {
    id: "ph-rev-2",
    authorId: AUTHORS.joao.id,
    targetId: REVIEW_FEATURED_ARTISTS.rafael.id,
    portfolioId: PORTFOLIOS.realismo.id,
    rating: 5,
    content:
      "Realismo de outro nível. O Rafael fechou o retrato do meu avô com luz e textura que parecem fotografia.",
    artistReply: null,
    repliedAt: null,
    isVerified: true,
    createdAt: "2026-09-02T11:05:00.000Z",
    author: AUTHORS.joao,
    target: REVIEW_FEATURED_ARTISTS.rafael,
    portfolio: PORTFOLIOS.realismo,
  },
  {
    id: "ph-rev-3",
    authorId: AUTHORS.leticia.id,
    targetId: REVIEW_FEATURED_ARTISTS.bianca.id,
    portfolioId: PORTFOLIOS.blackwork.id,
    rating: 5,
    content:
      "Blackwork pesado, simétrico e sem blowout. Sessão longa, mas a Bianca controlou a dor e o ritmo com maestria.",
    artistReply:
      "Valeu demais, Letícia. Blackwork pede paciência dos dois lados — você foi impecável na recuperação.",
    repliedAt: "2026-08-29T19:10:00.000Z",
    isVerified: true,
    createdAt: "2026-08-21T18:30:00.000Z",
    author: AUTHORS.leticia,
    target: REVIEW_FEATURED_ARTISTS.bianca,
    portfolio: PORTFOLIOS.blackwork,
  },
  {
    id: "ph-rev-4",
    authorId: AUTHORS.henrique.id,
    targetId: REVIEW_FEATURED_ARTISTS.diego.id,
    portfolioId: PORTFOLIOS.oldSchool.id,
    rating: 4,
    content:
      "Old school clássico, linhas firmes e cores saturadas. Único ponto: a sessão atrasou uns 20 min, mas o resultado compensou.",
    artistReply: null,
    repliedAt: null,
    isVerified: true,
    createdAt: "2026-08-14T09:50:00.000Z",
    author: AUTHORS.henrique,
    target: REVIEW_FEATURED_ARTISTS.diego,
    portfolio: PORTFOLIOS.oldSchool,
  },
  {
    id: "ph-rev-5",
    authorId: AUTHORS.carolina.id,
    targetId: REVIEW_FEATURED_ARTISTS.camila.id,
    portfolioId: PORTFOLIOS.minimalista.id,
    rating: 5,
    content:
      "Minimalista exatamente do jeito que pedi: discreto, elegante e proporcional. Estúdio silencioso e higiene nota 10.",
    artistReply:
      "Carolina, obrigada. Peças mínimas vivem do equilíbrio — fico feliz que tenha saído do jeito que você imaginou.",
    repliedAt: "2026-07-30T12:00:00.000Z",
    isVerified: true,
    createdAt: "2026-07-22T15:15:00.000Z",
    author: AUTHORS.carolina,
    target: REVIEW_FEATURED_ARTISTS.camila,
    portfolio: PORTFOLIOS.minimalista,
  },
  {
    id: "ph-rev-6",
    authorId: AUTHORS.bruno.id,
    targetId: REVIEW_FEATURED_ARTISTS.bianca.id,
    portfolioId: PORTFOLIOS.oriental.id,
    rating: 5,
    content:
      "Manga oriental que dialoga com o que já tinha no ombro. A Bianca estudou o fluxo do dragão antes de cravar uma linha.",
    artistReply: null,
    repliedAt: null,
    isVerified: true,
    createdAt: "2026-07-08T20:05:00.000Z",
    author: AUTHORS.bruno,
    target: REVIEW_FEATURED_ARTISTS.bianca,
    portfolio: PORTFOLIOS.oriental,
  },
  {
    id: "ph-rev-7",
    authorId: AUTHORS.ana.id,
    targetId: REVIEW_FEATURED_ARTISTS.rafael.id,
    portfolioId: PORTFOLIOS.realismo.id,
    rating: 4,
    content:
      "Sombras profundas e pele respeitada. Voltei só para um micro retoque na luz da íris — processo transparente do início ao fim.",
    artistReply: null,
    repliedAt: null,
    isVerified: false,
    createdAt: "2026-06-19T13:40:00.000Z",
    author: AUTHORS.ana,
    target: REVIEW_FEATURED_ARTISTS.rafael,
    portfolio: PORTFOLIOS.realismo,
  },
  {
    id: "ph-rev-8",
    authorId: AUTHORS.leticia.id,
    targetId: REVIEW_FEATURED_ARTISTS.marina.id,
    portfolioId: PORTFOLIOS.fineLine.id,
    rating: 5,
    content:
      "Flor delicate line no antebraço. Traço contínuo, sem vacilo, e aftercare enviado no mesmo dia com fotos de referência.",
    artistReply: null,
    repliedAt: null,
    isVerified: true,
    createdAt: "2026-06-03T10:22:00.000Z",
    author: AUTHORS.leticia,
    target: REVIEW_FEATURED_ARTISTS.marina,
    portfolio: PORTFOLIOS.fineLine,
  },
];

const PLACEHOLDER_NEARBY_ARTISTS = Object.keys(FEATURED_ARTIST_GEO).map((key) => {
  const artist = REVIEW_FEATURED_ARTISTS[key];
  const geo = FEATURED_ARTIST_GEO[key];
  return {
    id: artist.id,
    name: artist.name,
    role: artist.role,
    avatarUrl: artist.avatarUrl,
    initial: artist.initial,
    latitude: geo.latitude,
    longitude: geo.longitude,
    address: geo.address,
  };
});

module.exports = {
  REVIEW_FEATURED_ARTISTS,
  FEATURED_ARTIST_GEO,
  PLACEHOLDER_INSPIRATIONS,
  PLACEHOLDER_REVIEWS,
  PLACEHOLDER_NEARBY_ARTISTS,
};
