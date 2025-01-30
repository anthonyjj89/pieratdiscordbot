const mongoose = require('mongoose');

// Check for required environment variables
if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI environment variable');
}

// Models
const ReportSchema = new mongoose.Schema({
    targetHandle: { type: String, required: true },
    reporterId: { type: String, required: true },
    cargoType: { type: String, required: true },
    boxes: { type: Number, required: true },
    sellLocation: { type: String, required: true },
    currentPrice: { type: Number, required: true },
    notes: String,
    timestamp: { type: Date, default: Date.now },
    guildId: { type: String, required: true },
    status: { type: String, default: 'unsold' },
    sellerId: { type: String, required: true }
});

const CrewMemberSchema = new mongoose.Schema({
    hitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    userId: { type: String, required: true },
    role: { type: String, required: true },
    roleRatio: { type: Number, required: true },
    share: { type: Number, required: true }
});

const StorageSchema = new mongoose.Schema({
    hitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    holderId: { type: String, required: true },
    status: { type: String, default: 'stored' },
    timestamp: { type: Date, default: Date.now }
});

const PaymentSchema = new mongoose.Schema({
    hitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    payerId: { type: String, required: true },
    receiverId: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

const PiracyHitSchema = new mongoose.Schema({
    targetId: { type: String, required: true },
    isOrg: { type: Boolean, required: true },
    hitDate: { type: Date, default: Date.now },
    details: String,
    orgId: String,
    memberHandle: String
});

// Create models
const Report = mongoose.model('Report', ReportSchema);
const CrewMember = mongoose.model('CrewMember', CrewMemberSchema);
const Storage = mongoose.model('Storage', StorageSchema);
const PiracyHit = mongoose.model('PiracyHit', PiracyHitSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

class MongoDatabaseService {
    constructor() {
        this.connect();
        
        // Role share ratios (same as SQLite)
        this.roleRatios = {
            general_crew: 1.0,
            pilot: 0.8,
            gunner: 0.8,
            boarder: 1.2,
            escort: 1.1,
            storage: 1.0
        };
    }

    async connect() {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                ssl: true,
                tls: true,
                tlsAllowInvalidCertificates: true,
                retryWrites: true,
                w: 'majority',
                serverSelectionTimeoutMS: 15000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 45000
            });
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    // Reports
    async addReport(report) {
        const newReport = new Report(report);
        const savedReport = await newReport.save();
        return savedReport._id;
    }

    async getReports(guildId = null, page = 1, limit = 5) {
        const query = guildId ? { guildId } : {};
        const skip = (page - 1) * limit;

        const reports = await Report.aggregate([
            { $match: query },
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'crewmembers',
                    localField: '_id',
                    foreignField: 'hitId',
                    as: 'crew'
                }
            },
            {
                $lookup: {
                    from: 'storages',
                    localField: '_id',
                    foreignField: 'hitId',
                    as: 'storage'
                }
            }
        ]);

        return reports.map(report => ({
            ...report,
            storage_holder: report.storage[0]?.holderId || null
        }));
    }

    async getTotalReports(guildId = null) {
        const query = guildId ? { guildId } : {};
        return await Report.countDocuments(query);
    }

    // Crew Members
    async addCrewMember(crewMember) {
        const roleRatio = this.roleRatios[crewMember.role] || this.roleRatios.general_crew;
        const newCrewMember = new CrewMember({
            ...crewMember,
            roleRatio
        });
        const savedCrewMember = await newCrewMember.save();
        return savedCrewMember._id;
    }

    // Storage
    async setStorage(storage) {
        const newStorage = new Storage(storage);
        const savedStorage = await newStorage.save();
        return savedStorage._id;
    }

    // Piracy Hits
    async addPiracyHit(targetId, isOrg = false, details = '', orgId = null, memberHandle = null) {
        const newHit = new PiracyHit({
            targetId,
            isOrg,
            details,
            orgId,
            memberHandle
        });
        const savedHit = await newHit.save();
        return savedHit._id;
    }

    async getPiracyHistory(targetId, isOrg = false, limit = 5) {
        const query = isOrg ? 
            { targetId, isOrg: true } : 
            { targetId, isOrg: false };

        if (isOrg) {
            const orgHits = await PiracyHit.aggregate([
                { $match: query },
                { $sort: { hitDate: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'piracyhits',
                        let: { memberHandle: '$memberHandle' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$targetId', '$$memberHandle'] },
                                            { $eq: ['$isOrg', false] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'memberHits'
                    }
                }
            ]);

            return orgHits.map(hit => ({
                org_id: hit.targetId,
                hit_date: hit.hitDate,
                details: hit.details,
                member_handle: hit.memberHandle,
                member_hit_details: hit.memberHits[0]?.details,
                member_hit_date: hit.memberHits[0]?.hitDate,
                member_org_id: hit.memberHits[0]?.orgId
            }));
        } else {
            const userHits = await PiracyHit.aggregate([
                { $match: query },
                { $sort: { hitDate: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'piracyhits',
                        let: { orgId: '$orgId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$targetId', '$$orgId'] },
                                            { $eq: ['$isOrg', true] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'orgHits'
                    }
                }
            ]);

            return userHits.map(hit => ({
                user_id: hit.targetId,
                hit_date: hit.hitDate,
                details: hit.details,
                org_id: hit.orgId,
                org_hit_details: hit.orgHits[0]?.details,
                org_hit_date: hit.orgHits[0]?.hitDate,
                org_member_handle: hit.orgHits[0]?.memberHandle
            }));
        }
    }

    async addPayment(payment) {
        const newPayment = new Payment(payment);
        const savedPayment = await newPayment.save();
        return savedPayment._id;
    }

    async getUserBalance(userId, guildId) {
        // Get all reports where user is a crew member
        const reports = await Report.aggregate([
            {
                $lookup: {
                    from: 'crewmembers',
                    localField: '_id',
                    foreignField: 'hitId',
                    as: 'crew'
                }
            },
            {
                $match: {
                    'crew.userId': userId,
                    guildId: guildId
                }
            }
        ]);

        // Get all payments received by user
        const payments = await Payment.find({ receiverId: userId });
        const totalReceived = payments.reduce((sum, payment) => sum + payment.amount, 0);

        let totalShare = 0;

        // Calculate total share value
        for (const report of reports) {
            const crewMember = report.crew.find(c => c.userId === userId);
            if (crewMember) {
                const totalValue = report.boxes * 100 * report.currentPrice;
                totalShare += totalValue * crewMember.share;
            }
        }

        return {
            total_share: Math.floor(totalShare),
            total_received: totalReceived
        };
    }

    async getRecentPiracyHits(targetId, isOrg = false) {
        const query = isOrg ? 
            { targetId, isOrg: true } : 
            { targetId, isOrg: false };

        if (isOrg) {
            const result = await PiracyHit.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        total_hits: { $sum: 1 },
                        last_hit: { $max: '$hitDate' },
                        unique_members_hit: { $addToSet: '$memberHandle' }
                    }
                }
            ]);

            return result[0] ? {
                total_hits: result[0].total_hits,
                last_hit: result[0].last_hit,
                unique_members_hit: result[0].unique_members_hit.length
            } : {
                total_hits: 0,
                last_hit: null,
                unique_members_hit: 0
            };
        } else {
            const result = await PiracyHit.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        total_hits: { $sum: 1 },
                        last_hit: { $max: '$hitDate' },
                        orgs_involved: { $addToSet: '$orgId' }
                    }
                }
            ]);

            return result[0] ? {
                total_hits: result[0].total_hits,
                last_hit: result[0].last_hit,
                orgs_involved: result[0].orgs_involved.filter(Boolean).length
            } : {
                total_hits: 0,
                last_hit: null,
                orgs_involved: 0
            };
        }
    }
}

module.exports = new MongoDatabaseService();
