export type ReviewAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  initial: string;
};

export type ReviewTarget = {
  id: string;
  name: string;
  role: 'tatuador' | 'estudio';
  avatarUrl: string | null;
  initial: string;
};

export type ReviewPortfolioRef = {
  id: string;
  imageUrl: string;
  style: string;
} | null;

export type ReviewDto = {
  id: string;
  authorId: string;
  targetId: string;
  portfolioId: string | null;
  rating: number;
  content: string;
  artistReply: string | null;
  repliedAt: string | null;
  isVerified: boolean;
  createdAt: string;
  author: ReviewAuthor;
  target: ReviewTarget;
  portfolio: ReviewPortfolioRef;
};

export type ReviewSummary = {
  targetId: string;
  count: number;
  averageRating: number;
  verifiedCount: number;
};

export type ArtistReviewsPayload = {
  target: ReviewTarget;
  summary: ReviewSummary;
  reviews: ReviewDto[];
};

export type FeaturedReviewsPayload = {
  reviews: ReviewDto[];
};

export type ReplyToReviewInput = {
  reviewId: string;
  reply: string;
};
