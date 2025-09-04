export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  imageUrl?: string;
  images?: string[];
  sellerId: string;
  sellerName: string;
  status: 'active' | 'expired' | 'sold';
  endTime?: Date;
  createdAt: Date;
  bids: Bid[];
  isHot?: boolean;
  isExpiringSoon?: boolean;
  participants?: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  createdAt: Date;
}

export interface AuctionCategory {
  id: string;
  name: string;
  icon: string;
}
