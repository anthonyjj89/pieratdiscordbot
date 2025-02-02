import mongoose from 'mongoose';
import { User, Organization, Report } from '../types/models';

const UserSchema = new mongoose.Schema<User>({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  handle: String,
  organizations: [String],
  roles: {
    type: Map,
    of: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const OrganizationSchema = new mongoose.Schema<Organization>({
  sid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  logoUrl: String,
  memberCount: {
    type: Number,
    default: 0
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'redacted'],
    default: 'public'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const ReportSchema = new mongoose.Schema<Report>({
  targetHandle: {
    type: String,
    required: true,
    index: true
  },
  organization: {
    type: String,
    required: true,
    index: true
  },
  reporter: {
    type: String,
    required: true,
    index: true
  },
  cargo: [{
    cargoType: {
      type: String,
      required: true
    },
    scu: {
      type: Number,
      required: true
    },
    sellLocation: String,
    currentPrice: Number
  }],
  crew: [{
    userId: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['pilot', 'gunner', 'boarder', 'escort', 'storage', 'general_crew'],
      required: true
    },
    share: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    }
  }],
  totalValue: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'disputed', 'cancelled'],
    default: 'pending'
  },
  notes: String,
  location: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    discordChannelId: String,
    discordMessageId: String,
    screenshots: [String],
    tags: [String]
  }
});

// Add timestamps to all schemas
UserSchema.set('timestamps', true);
OrganizationSchema.set('timestamps', true);
ReportSchema.set('timestamps', true);

// Add indexes for common queries
ReportSchema.index({ organization: 1, timestamp: -1 });
ReportSchema.index({ 'crew.userId': 1, timestamp: -1 });
ReportSchema.index({ targetHandle: 1, timestamp: -1 });

// Export models
export const models = {
  User: mongoose.models.User || mongoose.model<User>('User', UserSchema),
  Organization: mongoose.models.Organization || mongoose.model<Organization>('Organization', OrganizationSchema),
  Report: mongoose.models.Report || mongoose.model<Report>('Report', ReportSchema)
};
