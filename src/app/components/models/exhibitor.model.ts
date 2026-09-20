export interface Exhibitor {
  id: string;
  name: string;
  stand: string;
  category: 'mineria' | 'energia' | 'agro' | 'tecnologia' | 'logistica';
  subtitle: string;
  description: string;
  origin: string;
  verified?: boolean;
}

export interface ExhibitorResponse {
  items: Exhibitor[];
  total: number;
  hasMore: boolean;
  page: number;
}