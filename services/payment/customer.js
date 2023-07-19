/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-return-await */
const paymentService = require('../payment');
const sql = require('../db');
const moment = require('moment-timezone');
const paymentPriceService = require('../payment/price');
const paymentInvoiceItemService = require('../payment/invoice-item');
const paymentInvoiceService = require('../payment/invoice');
const paymentStatusService = require('../payment/status');
const userService = require('../../services/user');
const utils = require('../../helpers/utils');
const loggerService = require('../../services/logger');

const logger = loggerService.temporaryVersion;


const stripe = paymentService.stripe();
const stripeQueries = sql.queries.stripe;

function authorizeCustomer({ email, description }) {
  return stripe.customers.create({ email, description });
}

function unAuthorizeCustomer(token) {
  return stripe.customers.del(token);
}

function updateStripeCustomer({ stripeCustomerToken, cardToken }) {
  return stripe.customers.update(
    stripeCustomerToken, {
      default_source: cardToken
    }
  );
}

async function getCustomerById(client, { customerId = null }) {
  const db = client || sql.getDB();
  const result = await db.query(stripeQueries.customers.get.byCustomerId, [customerId]);
  const customer = result.rows[0];
  if (typeof customer !== 'undefined') {
    logger.info(`stripeCustomer => ${JSON.stringify(customer)}`);
    return customer;
  }
}

async function getCustomers(client) {
  const db = client || sql.getDB();
  const result = await db.query(stripeQueries.customers.get.all);
  return result.rows;
}

function getStripeCustomer(objectId) {
  return stripe.customers.retrieve(objectId);
}

async function createCustomer(client, { customerId, token, priceId = null }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.customers.create, [customerId, token, priceId]);
    return sqlResult.rows[0];
  } catch (e) {
    logger.error(e);
  }
}

async function deleteCustomer(client, { stripeCustomerId }) {
  const db = client || sql.getDB();

  await db.query(stripeQueries.customers.delete.byStripeCustomerId, [
    stripeCustomerId
  ]);
}

async function deleteCustomers(client, { customerId }) {
  const db = client || sql.getDB();

  await db.query(stripeQueries.customers.delete.byCustomerId, [
    customerId
  ]);
}

function isRegisteredThisMonth(user) {
  const thisYear = moment().get('year');
  const thisMonth = moment().get('month');
  const isThisYearRegistered = moment(user.createdAt).get('year') === thisYear;
  const isThisMonthRegistered = moment(user.createdAt).get('month') === thisMonth;

  return isThisYearRegistered && isThisMonthRegistered;
}

async function getUsers({ customerId }) {
  const OFFSET = 0;
  const LIMIT = 99999999999;
  const users = await userService.users.getAll.records({
    customerId, offset: OFFSET, limit: LIMIT
  });

  const killedUsers = await userService.users.getAll.killedUsers(null, {
    customerId,
    startDate: moment().startOf('month').format('YYYY-MM-DD')
  });
  const registeredThisMonth = [];
  const notRegisteredThisMonth = [];

  for (const user of users) {
    if (isRegisteredThisMonth(user)) {
      registeredThisMonth.push(user);
    } else {
      notRegisteredThisMonth.push(user);
    }
  }

  if (!killedUsers.length && !registeredThisMonth.length && !notRegisteredThisMonth.length) {
    return null;
  }

  return { killedUsers, registeredThisMonth, notRegisteredThisMonth };
}

function getDaysInMonth() {
  return utils.daysInMonth({
    year: moment().get('year'),
    month: moment().get('month')
  });
}

function getRegisteredDaysQuantity(users) {
  const daysInMonth = getDaysInMonth();
  let registeredDays = 0;

  const now = moment();
  for (const user of users.registeredThisMonth) {
    const createdAt = moment(user.createdAt);
    registeredDays += Math.ceil(now.diff(createdAt, 'days', true)) + 1;
  }

  for (const user of users.killedUsers) {
    const createdAt = moment(user.createdAt);
    const deletedAt = moment(user.deletedAt);

    const isThisMonthDeleted = moment(deletedAt).isAfter(
      moment().format('YYYY-MM-01')
    );

    if (isThisMonthDeleted) {
      const isCreatedDeletedSameMonth = deletedAt.get('year') === createdAt.get('year') &&
        deletedAt.get('month') === createdAt.get('month');

      registeredDays += isCreatedDeletedSameMonth ?
        (deletedAt.get('date') - createdAt.get('date')) + 1 :
        deletedAt.get('date');
    }
  }

  for (const user of users.notRegisteredThisMonth) {
    if (!user.deletedAt) {
      registeredDays += daysInMonth;
    }
  }

  return registeredDays;
}

/**
 * Returns the number of users based on the time the application has been used
 * @param {object} users
 * @returns {number}
 */
function getCountOfUsers(users) {
  const registeredDays = getRegisteredDaysQuantity(users);
  return Math.floor(registeredDays / getDaysInMonth());
}

async function createInvoiceItem({ price, customer, quantity }) {
  const authorizedInvoiceItem = await paymentInvoiceItemService.authorize({
    priceToken: price.token,
    customerToken: customer.token,
    quantity,
    period: {
      start: moment().startOf('month').unix(),
      end: moment().endOf('month').unix()
    }
  });
  return await paymentInvoiceItemService.create(null, {
    priceId: price.priceId,
    stripeCustomerId: customer.stripeCustomerId,
    quantity,
    token: authorizedInvoiceItem.id
  });
}

async function createInvoice({ customerToken, customerStripeId }) {
  const authorizedInvoice = await paymentInvoiceService.authorize({
    customerToken, autoAdvance: true
  });
  return await paymentInvoiceService.create(null, {
    customerStripeId,
    paid: true,
    token: authorizedInvoice.id,
    totalAmount: authorizedInvoice.total
  });
}

async function billCustomer(customer) {
  const price = await paymentPriceService.get(null, { priceId: customer.priceId });
  if (!price) {
    throw new Error('EMPTY_PRICE');
  }
  logger.info(`price => ${JSON.stringify(price)}`);


  const users = await getUsers({ customerId: customer.customerId });
  if (!users) {
    throw new Error('EMPTY_USERS');
  }
  logger.info(`users => ${JSON.stringify(users)}`);


  const countOfUsers = getCountOfUsers(users);
  if (!countOfUsers) {
    throw new Error(`The used users registration time is less than ${getDaysInMonth()} days.`);
  }
  logger.info(`countOfUsers => ${countOfUsers}`);


  const invoiceItem = await createInvoiceItem({
    price,
    customer,
    quantity: countOfUsers
  });
  logger.info(`invoiceItem => ${JSON.stringify(invoiceItem)}`);


  const invoice = await createInvoice({
    customerToken: customer.token,
    customerStripeId: customer.stripeCustomerId
  });
  logger.info(`invoice => ${JSON.stringify(invoice)}`);


  let paid = false;
  let errorCode = null;
  try {
    const payInvoice = await paymentInvoiceService.pay(invoice.token);
    paid = payInvoice.paid;
    logger.info(`paidInvoice => ${JSON.stringify(payInvoice)}`);
  } catch (e) {
    errorCode = e.raw && e.raw.code ? e.raw.code : 'unknown';
    logger.error(e);
  }


  const paymentStatus = await paymentStatusService.createOrUpdate(null, {
    customerId: customer.customerId,
    paid,
    errorCode
  });
  logger.info(`paymentStatus => ${JSON.stringify(paymentStatus)}`);

  return paymentStatus;
}

async function billAllCustomers() {
  let customers = [];
  try {
    customers = await getCustomers(null);
    logger.info(`customers => ${JSON.stringify(customers)}`);
  } catch (e) {
    logger.error(e);
  }

  for (const customer of customers) {
    logger.info(`customerId => *********** ${customer.customerId} ************`);
    try {
      await billCustomer(customer);
    } catch (e) {
      logger.error(e);
    }
    logger.info(`customerId => *********** ${customer.customerId} ************`);
  }
}


module.exports = {
  getByCustomerId: getCustomerById,
  create: createCustomer,
  delete: {
    customer: deleteCustomer,
    customers: deleteCustomers
  },
  updateStripe: updateStripeCustomer,
  retrieve: getStripeCustomer,
  authorize: authorizeCustomer,
  unAuthorize: unAuthorizeCustomer,
  billAllCustomers,
  billCustomer
};
