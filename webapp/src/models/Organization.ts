import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  discordGuildId: {
    type: String,
    required: true,
    unique: true,
  },
  adminRoles: [{
    type: String,
    required: true,
  }],
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roles: [String],
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  settings: {
    allowPublicReports: {
      type: Boolean,
      default: false,
    },
    webhookUrl: String,
    webhookSettings: {
      sendHitReports: {
        type: Boolean,
        default: true,
      },
      sendAnalytics: {
        type: Boolean,
        default: false,
      },
    },
    allowedOrgs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    }],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
OrganizationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
