const db = require('./database');

const UserService = require('../services/userService');
const GradeService = require('../services/gradeService');
const ChatService = require('../services/chatService');
const ReportService = require('../services/reportService');
const NotificationService = require('../services/notificationService');
const BackupService = require('../services/backupService');
const CryptoService = require('../services/cryptoService');
const ScheduleService = require('../services/scheduleService');
const AdminService = require('../services/adminService');
const HomeworkService = require('../services/homeworkService');
const AnnouncementService = require('../services/announcementService');

const cryptoService = new CryptoService();
const notificationService = new NotificationService(db);
const backupService = new BackupService();

module.exports = {
  userService: new UserService(db),
  gradeService: new GradeService(db, notificationService),
  chatService: new ChatService(db, cryptoService),
  reportService: new ReportService(db),
  scheduleService: new ScheduleService(db),
  adminService: new AdminService(db),
  notificationService,
  backupService,
  cryptoService,
  homeworkService: new HomeworkService(db),
  announcementService: new AnnouncementService(db),
};
