const paymentService = require('../payment');
const logger = require('../logger');
const sql = require('../db');
const paymentCustomerService = require('./customer');
const paymentCardService = require('./card');
const paymentProductService = require('./product');
const paymentPriceService = require('./price');
const paymentSubscriptionItemsService = require('./subscription-item');
const paymentTierService = require('./tier');

const stripeQueries = sql.queries.stripe;
const stripe = paymentService.stripe();

const SUBSCRIPTION_CONSTANTS = {
  LICENSED: 1,
  METERED: 2
};

function authorizeSubscription({ stripeCustomerToken, items, trialDays = 0 }) {
  const trialEnd = (24 * 3600 * 1000) * trialDays;
  return stripe.subscriptions.create({
    customer: stripeCustomerToken,
    items,
    trial_end: new Date(Date.now() + trialEnd),
  });
}

function unAuthorizeSubscription(token) {
  if (token) {
    return stripe.subscriptions.del(token);
  }
}

function getSubscription(subscriptionId) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

async function createSubscription(client, { token, stripeCustomerId }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.subscriptions.create, [
      token, stripeCustomerId
    ]);
    const subscription = sqlResult.rows[0];
    return subscription;
  } catch (e) {
    logger.info(e);
  }
}

async function deleteSubscription(client, { subscriptionId }) {
  const db = client || sql.getDB();

  try {
    await db.query(stripeQueries.subscriptions.delete, [
      subscriptionId
    ]);
  } catch (e) {
    logger.info(e);
  }
}

async function subscribeCustomer(db, { customer, authorizedCardToken }) {
  const client = db || await sql.getDB().connect();
  logger.info('=> Client connected');

  const tierGroupId = 1;
  let stripeCustomer = {};
  let authorizedStripeCustomer = {};
  let authorizedCard = {};
  let authorizedSubscription = {};

  await client.query('BEGIN');

  try {
    // create stripe customer
    authorizedStripeCustomer = await paymentCustomerService.authorize({
      email: customer.email,
      description: `Customer: ${customer.email}, CreatedAt:${new Date()}, Creator: ${customer.email}`
    });
    logger.info(`authorizeStripeCustomer => ${JSON.stringify(authorizedStripeCustomer)}`);
    stripeCustomer = await paymentCustomerService.create(client, {
      token: authorizedStripeCustomer.id, customerId: customer.id
    });
    logger.info(`stripeCustomer => ${JSON.stringify(stripeCustomer)}`);


    // attach card to customer
    authorizedCard = await paymentCardService.authorize({
      customerToken: stripeCustomer.token, source: authorizedCardToken.id
    });
    logger.info(`authorizedStripeCard => ${JSON.stringify(authorizedCard)}`);
    const card = await paymentCardService.create(client, {
      stripeCustomer, source: authorizedCard.id, isDefault: true, meta: authorizedCardToken,
    });
    logger.info(`card => ${JSON.stringify(card)}`);


    // create a customer product
    const authorizedProduct = await paymentProductService.authorize({
      name: `${customer.email}`, type: 'service', active: true,
    });
    logger.info(`authorizedProduct => ${JSON.stringify(authorizedProduct)}`);
    const product = await paymentProductService.create(client, {
      stripeCustomerId: stripeCustomer.stripeCustomerId, token: authorizedProduct.id,
    });
    logger.info(`product => ${JSON.stringify(product)}`);


    // get the tiers
    const tiers = await paymentTierService.getTiersByGroupId(client, { tierGroupId });
    const tierPricing = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const tier of tiers) {
      tierPricing.push({ unit_amount: Number(tier.amount), up_to: tier.upToNumber });
    }


    // create tier-group-customer
    const tierGroupCustomer = await paymentTierService.createTierGroupCustomer(client, {
      stripeCustomerId: stripeCustomer.stripeCustomerId, tierGroupId,
    });
    logger.info(`tierGroupCustomer => ${JSON.stringify(tierGroupCustomer)}`);

    // create customer product price
    const authorizedPrice = await paymentPriceService.authorize({
      amount: null,
      productToken: product.token,
      currency: 'usd',
      recurring: { interval: 'month', usage_type: 'metered', },
      billingScheme: 'tiered',
      tiersMode: 'volume',
      tiers: tierPricing,
      tierGroupCustomerId: tierGroupCustomer.tierGroupCustomerId,
    });
    logger.info(`=> authorizedPrice: ${JSON.stringify(authorizedPrice)}`);
    const price = await paymentPriceService.create(client, {
      tierGroupCustomerId: tierGroupCustomer.tierGroupCustomerId,
      token: authorizedPrice.id,
      amount: null,
      productId: product.productId,
    });
    logger.info(`price => ${JSON.stringify(price)}`);


    // subscribe customer to items
    authorizedSubscription = await authorizeSubscription({
      stripeCustomerToken: stripeCustomer.token,
      items: [{ price: price.token }],
    });
    logger.info(`authorizedSubscription => ${JSON.stringify(authorizedSubscription)}`);
    const subscription = await createSubscription(client, {
      token: authorizedSubscription.id, stripeCustomerId: stripeCustomer.stripeCustomerId,
    });
    logger.info(`subscription => ${JSON.stringify(subscription)}`);


    // save subscription items
    const subscriptionItem = await paymentSubscriptionItemsService.create(client, {
      subscriptionId: subscription.subscriptionId,
      subscriptionItem: authorizedSubscription.items.data[0],
      priceId: price.priceId,
    });
    logger.info(`subscriptionItem => ${JSON.stringify(subscriptionItem)}`);

    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');

    await unAuthorizeSubscription(authorizedSubscription.id);
    await paymentCardService.unAuthorize({
      stripeCustomerToken: stripeCustomer.token, source: authorizedCard.id,
    });
    await paymentCustomerService.unAuthorize(authorizedStripeCustomer.id);

    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  subscribeCustomer,
  retrieve: getSubscription,
  SUBSCRIPTION_CONSTANTS,
  create: createSubscription,
  delete: deleteSubscription,
  authorize: authorizeSubscription,
  unAuthorize: unAuthorizeSubscription,
};
