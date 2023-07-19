const logger = require('../logger');
const paymentService = require('../payment');
const sql = require('../db');
const serviceQueries = require('../../sql/sql-queries');

const stripeQueries = sql.queries.stripe;
const stripe = paymentService.stripe();

const productTypes = ['service', 'good'];

function getProductType(type) {
  if (typeof type !== 'string') {
    logger.error('Invalid data type of stripe product');
    return undefined;
  }
  return productTypes.includes(type) ? type : undefined;
}

function authorizeProduct({ name, type, active }) {
  return stripe.products.create({ name, type, active });
}

function unAuthorizeProduct({ token }) {
  return stripe.products.del(token);
}

async function getStripeCustomerByCustomerId(db, customerId) {
  const product = await db.query(serviceQueries.payments.products.customer, [
    customerId
  ]);
  logger.info(product.rows[0]);
  return product.rows[0];
}

async function createProduct(client, { stripeCustomerId, token }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.products.createProduct, [
      token, stripeCustomerId
    ]);
    const product = sqlResult.rows[0];
    return product;
  } catch (e) {
    logger.error(e);
  }
}

async function deleteProduct(client, { productId }) {
  const db = client || sql.getDB();

  try {
    await db.query(stripeQueries.products.delete, [productId]);
  } catch (e) {
    logger.error(e);
  }
}

async function getProductByCustomerId(client, customerId) {
  const db = client || sql.getDB();
  const product = await db.query(serviceQueries.payments.products.getProductByCustomerId, [
    customerId
  ]);
  logger.info(product.rows[0]);
  return product.rows[0];
}

async function getProducts({ startingAfter, limit }) {
  const qs = {
    limit
  };
  if (typeof startingAfter !== 'undefined') {
    qs.starting_after = startingAfter;
  }
  return stripe.products.list(qs);
}


async function getProduct({ productId }) {
  return stripe.products.retrieve(productId);
}


async function updateProduct(productId, { active, name }) {
  const data = { active, name };
  return stripe.products.update(productId, data);
}


module.exports = {
  getProductType,
  list: getProducts,
  get: getProduct,
  getProductByCustomerId,
  update: updateProduct,
  create: createProduct,
  delete: deleteProduct,
  authorize: authorizeProduct,
  unAuthorize: unAuthorizeProduct,
};
