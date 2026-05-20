// services/backupService.js
const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');

class BackupService {
  constructor(backupDir = './backups', retentionDays = 7) {
    this.backupDir = path.join(__dirname, '..', backupDir);
    this.retentionDays = retentionDays;
  }

  async init() {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  async create() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `school-backup-${timestamp}.db`);
    const sourcePath = path.join(__dirname, '..', 'school.db');
    
    await fs.copyFile(sourcePath, backupPath);
    
    await this._cleanupOld();
    
    console.log(`💾 Бэкап создан: ${backupPath}`);
    return backupPath;
  }

  async _cleanupOld() {
    const files = await fs.readdir(this.backupDir);
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      if (!file.startsWith('school-backup-') || !file.endsWith('.db')) continue;
      
      const filePath = path.join(this.backupDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtimeMs < cutoff) {
        await fs.unlink(filePath);
        console.log(`🗑️ Удалён старый бэкап: ${file}`);
      }
    }
  }

  async list() {
    const files = await fs.readdir(this.backupDir);
    return files
      .filter(f => f.startsWith('school-backup-') && f.endsWith('.db'))
      .map(name => ({
        name,
        path: path.join(this.backupDir, name),
        size: fs.stat(path.join(this.backupDir, name)).then(s => s.size),
        created: fs.stat(path.join(this.backupDir, name)).then(s => s.mtime),
      }));
  }
}

module.exports = new BackupService();