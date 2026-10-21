const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validate } = require('../middlewares/validation');
const { storeSettingsSchema } = require('../validators/storeSettingsValidator');
const {
  getStoreSettingsHandler,
  updateStoreSettingsHandler,
} = require('../controllers/storeSettingsController');

const router = express.Router();
router.use(authenticate, requireAdmin);
router.get('/', getStoreSettingsHandler);
router.patch('/', validate(storeSettingsSchema), updateStoreSettingsHandler);

module.exports = router;
