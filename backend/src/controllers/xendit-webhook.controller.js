const PaymentService = require('../services/payment/payment.service');
class XenditWebhookController {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    handlePaymentSessionWebhook = (req, res) => {
        return this.paymentService.handleXenditPaymentSessionWebhook(req, res);
    };
}
module.exports = new XenditWebhookController(PaymentService);
module.exports.XenditWebhookController = XenditWebhookController;
