const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class BackupService {
  private backupDir: string;
  private retentionDays: number;
  constructor(backupDir = './backups', retentionDays = 7) {
    this.backupDir = path.join(__dirname, '..', backupDir);
    this.retentionDays = retentionDays;
  }

  async init() {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  async create() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `school-backup-${timestamp}.sql`);

    try {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL not set');

      await new Promise<void>((resolve, reject) => {
        const pgDump = spawn('pg_dump', [url]);
        const outStream = fs.createWriteStream(backupPath);

        pgDump.stdout.pipe(outStream);

        let stderr = '';
        pgDump.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pgDump.on('error', (err) => reject(new Error(`pg_dump failed: ${err.message}`)));

        outStream.on('error', (err) => {
          pgDump.kill();
          reject(err);
        });

        pgDump.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
          }
        });
      });
    } catch (err) {
      console.error('Backup error:', err.message);
      throw err;
    }

    await this._cleanupOld();
    console.log(`Backup created: ${backupPath}`);
    return backupPath;
  }

  async _cleanupOld() {
    const files = await fs.readdir(this.backupDir);
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.startsWith('school-backup-') || !file.endsWith('.sql')) continue;

      const filePath = path.join(this.backupDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtimeMs < cutoff) {
        await fs.unlink(filePath);
        console.log(`Deleted old backup: ${file}`);
      }
    }
  }

  async list() {
    const files = await fs.readdir(this.backupDir);
    const backups = files.filter((f) => f.startsWith('school-backup-') && f.endsWith('.sql'));
    return Promise.all(
      backups.map(async (name) => {
        const stat = await fs.stat(path.join(this.backupDir, name));
        return { name, path: path.join(this.backupDir, name), size: stat.size, created: stat.mtime };
      }),
    );
  }

  async remove(name) {
    const filePath = this._safePath(name);
    await fs.unlink(filePath);
    return { success: true };
  }

  getPath(name) {
    return this._safePath(name);
  }

  _safePath(name) {
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new Error('Invalid backup name');
    }
    return path.join(this.backupDir, name);
  }
}

module.exports = BackupService;

