const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const logger = require('../middleware/logger');
const { userService } = require('../config/container');

router.use(auth, logger);

router.get('/profile', asyncHandler(async (req, res) => {
  const profile = await userService.getProfile(req.user.id);
  res.json(profile);
}));

module.exports = router;
