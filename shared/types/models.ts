export interface User {
  discordId: string;
  handle?: string;
  organizations: string[]; // Array of org SIDs
  roles: {
    [orgId: string]: string; // Role in each organization
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  sid: string;          // RSI organization SID
  name: string;         // Organization name
  description?: string;
  logoUrl?: string;
  memberCount: number;
  visibility: 'public' | 'private' | 'redacted';
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  targetHandle: string;
  organization: string; // Organization SID
  reporter: string;    // Discord ID
  cargo: Array<{
    cargoType: string;
    scu: number;
    sellLocation?: string;
    currentPrice?: number;
  }>;
  crew: Array<{
    userId: string;    // Discord ID
    role: 'pilot' | 'gunner' | 'boarder' | 'escort' | 'storage' | 'general_crew';
    share: number;     // Share percentage (0-1)
  }>;
  totalValue: number;
  status: 'pending' | 'completed' | 'disputed' | 'cancelled';
  notes?: string;
  location?: string;
  timestamp: Date;
  metadata?: {
    discordChannelId?: string;
    discordMessageId?: string;
    screenshots?: string[];
    tags?: string[];
  };
}
