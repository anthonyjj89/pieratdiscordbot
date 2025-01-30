const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

class DatabaseService {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../../data/reports.db'));
        this.initializeDatabase();
    }

    async initializeDatabase() {
        const createTables = `
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_handle TEXT NOT NULL,
                reporter_id TEXT NOT NULL,
                cargo_type TEXT NOT NULL,
                boxes INTEGER NOT NULL,
                sell_location TEXT NOT NULL,
                current_price REAL NOT NULL,
                notes TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                guild_id TEXT NOT NULL,
                status TEXT DEFAULT 'unsold',
                seller_id TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS crew_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hit_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                role_ratio FLOAT NOT NULL,
                share FLOAT NOT NULL,
                FOREIGN KEY (hit_id) REFERENCES reports(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS storage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hit_id INTEGER NOT NULL,
                holder_id TEXT NOT NULL,
                status TEXT DEFAULT 'stored',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hit_id) REFERENCES reports(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hit_id INTEGER NOT NULL,
                payer_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                amount FLOAT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hit_id) REFERENCES reports(id) ON DELETE CASCADE
            );

            -- Piracy tracking tables
            CREATE TABLE IF NOT EXISTS user_piracy_hits (
                user_id TEXT NOT NULL,
                hit_date TEXT DEFAULT CURRENT_TIMESTAMP,
                details TEXT,
                org_id TEXT,
                PRIMARY KEY (user_id, hit_date)
            );

            CREATE TABLE IF NOT EXISTS org_piracy_hits (
                org_id TEXT NOT NULL,
                hit_date TEXT DEFAULT CURRENT_TIMESTAMP,
                details TEXT,
                member_handle TEXT NOT NULL,
                PRIMARY KEY (org_id, hit_date)
            );
        `;

        return new Promise((resolve, reject) => {
            this.db.exec(createTables, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async addReport(report) {
        const sql = `
            INSERT INTO reports (
                target_handle, reporter_id, cargo_type, boxes, 
                sell_location, current_price, notes, guild_id, seller_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, [
                report.targetHandle,
                report.reporterId,
                report.cargoType,
                report.boxes,
                report.sellLocation,
                report.currentPrice,
                report.notes,
                report.guildId,
                report.sellerId
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Role share ratios
    roleRatios = {
        general_crew: 1.0,
        pilot: 0.8,
        gunner: 0.8,
        boarder: 1.2,
        escort: 1.1,
        storage: 1.0
    };

    async addCrewMember(crewMember) {
        const roleRatio = this.roleRatios[crewMember.role] || this.roleRatios.general_crew;
        
        const sql = `
            INSERT INTO crew_members (hit_id, user_id, role, role_ratio, share)
            VALUES (?, ?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.run(sql, [
                crewMember.hitId,
                crewMember.userId,
                crewMember.role,
                roleRatio,
                crewMember.share
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async setStorage(storage) {
        const sql = `
            INSERT INTO storage (hit_id, holder_id)
            VALUES (?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.run(sql, [
                storage.hitId,
                storage.holderId
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async addPayment(payment) {
        const sql = `
            INSERT INTO payments (hit_id, payer_id, receiver_id, amount)
            VALUES (?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.run(sql, [
                payment.hitId,
                payment.payerId,
                payment.receiverId,
                payment.amount
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async getReports(guildId, page = 1, limit = 5) {
        const offset = (page - 1) * limit;
        const sql = `
            SELECT 
                r.*,
                GROUP_CONCAT(DISTINCT cm.user_id || ',' || cm.share) as crew,
                s.holder_id as storage_holder
            FROM reports r
            LEFT JOIN crew_members cm ON r.id = cm.hit_id
            LEFT JOIN storage s ON r.id = s.hit_id
            WHERE r.guild_id = ? 
            GROUP BY r.id
            ORDER BY r.timestamp DESC 
            LIMIT ? OFFSET ?
        `;

        return new Promise((resolve, reject) => {
            this.db.all(sql, [guildId, limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Process crew data
                    const processedRows = rows.map(row => {
                        const crewData = row.crew ? row.crew.split(',') : [];
                        const crew = [];
                        for (let i = 0; i < crewData.length; i += 2) {
                            crew.push({
                                userId: crewData[i],
                                share: parseFloat(crewData[i + 1])
                            });
                        }
                        return {
                            ...row,
                            crew,
                            storage_holder: row.storage_holder || null
                        };
                    });
                    resolve(processedRows);
                }
            });
        });
    }

    async getTotalReports(guildId) {
        const sql = 'SELECT COUNT(*) as count FROM reports WHERE guild_id = ?';
        
        return new Promise((resolve, reject) => {
            this.db.get(sql, [guildId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    async getReportsByTarget(targetHandle, guildId) {
        const sql = `
            SELECT 
                r.*,
                GROUP_CONCAT(DISTINCT cm.user_id || ',' || cm.share) as crew,
                s.holder_id as storage_holder
            FROM reports r
            LEFT JOIN crew_members cm ON r.id = cm.hit_id
            LEFT JOIN storage s ON r.id = s.hit_id
            WHERE r.target_handle = ? AND r.guild_id = ?
            GROUP BY r.id
            ORDER BY r.timestamp DESC
        `;

        return new Promise((resolve, reject) => {
            this.db.all(sql, [targetHandle, guildId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Process crew data
                    const processedRows = rows.map(row => {
                        const crewData = row.crew ? row.crew.split(',') : [];
                        const crew = [];
                        for (let i = 0; i < crewData.length; i += 2) {
                            crew.push({
                                userId: crewData[i],
                                share: parseFloat(crewData[i + 1])
                            });
                        }
                        return {
                            ...row,
                            crew,
                            storage_holder: row.storage_holder || null
                        };
                    });
                    resolve(processedRows);
                }
            });
        });
    }

    async getUserBalance(userId, guildId) {
        const sql = `
            WITH crew_earnings AS (
                SELECT 
                    cm.user_id,
                    r.id as hit_id,
                    r.boxes * r.current_price * cm.share as potential_earnings,
                    COALESCE(SUM(p.amount), 0) as received_amount
                FROM crew_members cm
                JOIN reports r ON cm.hit_id = r.id
                LEFT JOIN payments p ON r.id = p.hit_id AND cm.user_id = p.receiver_id
                WHERE r.guild_id = ?
                GROUP BY cm.user_id, r.id
            )
            SELECT 
                user_id,
                SUM(potential_earnings) as total_potential,
                SUM(received_amount) as total_received
            FROM crew_earnings
            WHERE user_id = ?
            GROUP BY user_id
        `;

        return new Promise((resolve, reject) => {
            this.db.get(sql, [guildId, userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || { 
                        user_id: userId, 
                        total_potential: 0, 
                        total_received: 0 
                    });
                }
            });
        });
    }

    // Piracy tracking methods
    async addPiracyHit(targetId, isOrg = false, details = '', orgId = null, memberHandle = null) {
        if (isOrg) {
            const sql = `
                INSERT INTO org_piracy_hits (org_id, details, member_handle)
                VALUES (?, ?, ?)
            `;
            return new Promise((resolve, reject) => {
                this.db.run(sql, [targetId, details, memberHandle], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
        } else {
            const sql = `
                INSERT INTO user_piracy_hits (user_id, details, org_id)
                VALUES (?, ?, ?)
            `;
            return new Promise((resolve, reject) => {
                this.db.run(sql, [targetId, details, orgId], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
        }
    }

    async getPiracyHistory(targetId, isOrg = false, limit = 5) {
        if (isOrg) {
            const sql = `
                SELECT 
                    oh.org_id,
                    oh.hit_date,
                    oh.details,
                    oh.member_handle,
                    uh.details as member_hit_details,
                    uh.hit_date as member_hit_date,
                    uh.org_id as member_org_id
                FROM org_piracy_hits oh
                LEFT JOIN user_piracy_hits uh ON uh.user_id = oh.member_handle
                WHERE oh.org_id = ?
                ORDER BY oh.hit_date DESC
                LIMIT ?
            `;
            return new Promise((resolve, reject) => {
                this.db.all(sql, [targetId, limit], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        } else {
            const sql = `
                SELECT 
                    uh.user_id,
                    uh.hit_date,
                    uh.details,
                    uh.org_id,
                    oh.details as org_hit_details,
                    oh.hit_date as org_hit_date,
                    oh.member_handle as org_member_handle
                FROM user_piracy_hits uh
                LEFT JOIN org_piracy_hits oh ON oh.org_id = uh.org_id
                WHERE uh.user_id = ?
                ORDER BY uh.hit_date DESC
                LIMIT ?
            `;
            return new Promise((resolve, reject) => {
                this.db.all(sql, [targetId, limit], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        }
    }

    async getRecentPiracyHits(targetId, isOrg = false) {
        if (isOrg) {
            const sql = `
                SELECT 
                    COUNT(*) as total_hits,
                    MAX(oh.hit_date) as last_hit,
                    COUNT(DISTINCT oh.member_handle) as unique_members_hit
                FROM org_piracy_hits oh
                WHERE oh.org_id = ?
            `;
            return new Promise((resolve, reject) => {
                this.db.get(sql, [targetId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { total_hits: 0, last_hit: null, unique_members_hit: 0 });
                });
            });
        } else {
            const sql = `
                SELECT 
                    COUNT(*) as total_hits,
                    MAX(uh.hit_date) as last_hit,
                    COUNT(DISTINCT uh.org_id) as orgs_involved
                FROM user_piracy_hits uh
                WHERE uh.user_id = ?
            `;
            return new Promise((resolve, reject) => {
                this.db.get(sql, [targetId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { total_hits: 0, last_hit: null, orgs_involved: 0 });
                });
            });
        }
    }
}

module.exports = new DatabaseService();
