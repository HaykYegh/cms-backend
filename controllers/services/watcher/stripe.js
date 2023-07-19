const express = require('express');
const loggerService = require('../../../services/logger');
const { PAYMENTS } = require('../../../helpers/constants');

const router = express.Router();

const logger = loggerService.temporaryVersion;

/**
 * URL: /stripe-watcher/webhooks
 * METHOD: POST
 * Description: Stripe watcher
 */

router.post('/webhooks', async (req, res) => {
  const event = req.body;
  const EVENTS = PAYMENTS.STRIPE.WEBHOOKS.EVENTS;
  const paymentIntent = event.data.object;

  try {
    switch (event.type) {
      case EVENTS.INVOICE_PAYMENT_FAILED: {
        logger.info(`INVOICE_PAYMENT_FAILED => ${JSON.stringify(paymentIntent)}`);
        // const invoice = await paymentInvoiceService.update.invoice(null, {
        //   token: paymentIntent.id, paid: false
        // });
        // logger.info(`updatedInvoice => ${JSON.stringify(invoice)}`);
        break;
      }
      case EVENTS.INVOICE_PAYMENT_SUCCEEDED: {
        logger.info(`INVOICE_PAYMENT_SUCCEEDED => ${JSON.stringify(paymentIntent)}`);
        // const paymentIntent = event.data.object;
        // const invoice = await paymentInvoiceService.update.invoice(null, {
        //   token: paymentIntent.id, paid: true
        // });
        // logger.info(`updatedInvoice => ${JSON.stringify(invoice)}`);
        break;
      }
      default:
        logger.info(`webhookEvent => ${event.type} => ${JSON.stringify(paymentIntent)}`);
    }

    res.send({ received: true });
  } catch (e) {
    res.json({ err: true, err_msg: e });
    logger.error(e);
  }
});

module.exports = router;
