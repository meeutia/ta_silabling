const PaymentService = require('../services/payment/payment.service');

// Controller tipis ini sengaja didelegasikan ke PaymentService supaya hanya ada
// satu sumber kebenaran untuk pemrosesan webhook Xendit. Logic lama di controller
// berisiko tidak sinkron dengan service dan dapat menurunkan status pembayaran
// jika event gateway datang terlambat.
const handlePaymentSessionWebhook = (req, res) => {
  return PaymentService.handleXenditPaymentSessionWebhook(req, res);
};

module.exports = {
  handlePaymentSessionWebhook,
};
