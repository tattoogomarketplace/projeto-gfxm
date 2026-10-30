export const queryKeys = {
  agendaSessions: ['agenda', 'sessions'] as const,
  agendamentos: ['agendamentos'] as const,
  chatConversas: (category: string) => ['chat', 'conversas', category] as const,
  chatHistorico: (peerId: string) => ['chat', 'historico', peerId] as const,
  perfilEnsure: ['perfil', 'ensure'] as const,
  artistVitrine: (id: string) => ['artist', 'vitrine', id] as const,
  publicProfile: (username: string) => ['profile', 'public', username] as const,
  reviewDetail: (id: string) => ['reviews', 'detail', id] as const,
  nearbyArtists: (lat: number, lng: number, radius: number) =>
    ['artists', 'nearby', lat, lng, radius] as const,
  galleryFeed: (media: string = 'photo') => ['gallery', 'feed', media] as const,
  savedInspirationIds: ['inspirations', 'saved-ids'] as const,
  savedInspirations: ['inspirations', 'saved'] as const,
};
