const express = require('express');
const router = express.Router();
const XenditWebhookController = require('../controllers/xendit-webhook.controller');

router.post('/payment-session', XenditWebhookController.handlePaymentSessionWebhook);

module.exports = router;
