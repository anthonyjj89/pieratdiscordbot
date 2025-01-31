import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  targetHandle: {
    type: String,
    required: true,
    index: true,
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cargo: [{
    cargoType: {
      type: String,
      required: true,
    },
    scu: {
      type: Number,
      required: true,
    },
    sellLocation: String,
    currentPrice: Number,
  }],
  crew: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['pilot', 'gunner', 'boarder', 'escort', 'storage', 'general_crew'],
    },
    share: {
      type: Number,
      required: true,
    },
  }],
  totalValue: {
    type: Number,
    required: true,
  },
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'disputed', 'cancelled'],
    default: 'pending',
  },
  location: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  webhookMessageId: String,
  metadata: {
    discordChannelId: String,
    discordMessageId: String,
    screenshots: [String],
    tags: [String],
  },
});

// Indexes for common queries
ReportSchema.index({ organization: 1, timestamp: -1 });
ReportSchema.index({ 'crew.userId': 1, timestamp: -1 });
ReportSchema.index({ targetHandle: 1, timestamp: -1 });

export default mongoose.models.Report || mongoose.model('Report', ReportSchema);
