class AnnouncementService {
  constructor(db) {
    this.db = db;
  }

  async list(limit = 20) {
    return this.db.all(
      `SELECT a.*, u.name as user_name, u.role as user_role
       FROM announcements a
       JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit],
    );
  }

  async create({ user_id, title, content }) {
    const { rows } = await this.db.query(
      'INSERT INTO announcements (user_id, title, content) VALUES ($1,$2,$3) RETURNING id',
      [user_id, title, content],
    );
    return this.db.get('SELECT * FROM announcements WHERE id = $1', [rows[0].id]);
  }

  async delete(announcementId) {
    const a = await this.db.get('SELECT * FROM announcements WHERE id = $1', [announcementId]);
    if (!a) return false;
    await this.db.query('DELETE FROM announcements WHERE id = $1', [announcementId]);
    return true;
  }
}

module.exports = AnnouncementService;
