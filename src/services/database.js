const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

class DatabaseService {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../../data/reports.db'));
        this.initializeDatabase();
    }

    async initializeDatabase() {
        const createTable = `
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_handle TEXT NOT NULL,
                reporter_id TEXT NOT NULL,
                cargo_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                notes TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                guild_id TEXT NOT NULL
            )
        `;

        return new Promise((resolve, reject) => {
            this.db.run(createTable, (err) => {
                if (err) {
                    console.error('Error creating reports table:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async addReport(report) {
        const sql = `
            INSERT INTO reports (target_handle, reporter_id, cargo_type, amount, notes, guild_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, [
                report.targetHandle,
                report.reporterId,
                report.cargoType,
                report.amount,
                report.notes,
                report.guildId
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
            SELECT * FROM reports 
            WHERE guild_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
        `;

        return new Promise((resolve, reject) => {
            this.db.all(sql, [guildId, limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
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
            SELECT * FROM reports 
            WHERE target_handle = ? AND guild_id = ?
            ORDER BY timestamp DESC
        `;

        return new Promise((resolve, reject) => {
            this.db.all(sql, [targetHandle, guildId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

module.exports = new DatabaseService();
