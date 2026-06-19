const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const campaignController = require('../controllers/campaignController');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', campaignController.listCampaignsHandler);
router.post('/', campaignController.createCampaignHandler);
router.get('/:id', campaignController.getCampaignHandler);
router.patch('/:id', campaignController.updateCampaignHandler);

module.exports = router;
