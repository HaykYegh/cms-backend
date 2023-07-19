const logger = require('../logger');
const paymentService = require('../payment');

const stripe = paymentService.stripe();

const planIntervals = ['day', 'week', 'month', 'year'];

function getPlanIntervals(interval) {
  if (typeof interval !== 'string') {
    logger.error('Invalid data type of stripe plan interval');
    return undefined;
  }
  return planIntervals.includes(interval) ? interval : undefined;
}


async function createPlan({ productId, nickname, active, tiers, interval }) {
  return stripe.plans.create({
    product: productId,
    nickname,
    interval,
    billing_scheme: 'tiered',
    tiers_mode: 'volume',
    usage_type: 'metered',
    aggregate_usage: 'max',
    currency: 'usd',
    tiers,
    active,
  });
}

async function getPlans(params = {}) {
  const { startingAfter = '', limit = '', product = '' } = params;
  const qs = {};
  if (limit !== '') {
    qs.limit = limit;
  }
  if (startingAfter !== '') {
    qs.starting_after = startingAfter;
  }
  if (product !== '') {
    qs.product = product;
  }
  return stripe.plans.list(qs);
}

async function getPlan(planId) {
  return stripe.plans.retrieve(planId);
}

async function updatePlan(planId, { productId, nickname, active }) {
  const data = {};
  if (productId !== '') {
    data.product = productId;
  } else {
    data.nickname = nickname;
    data.active = active;
  }
  return stripe.plans.update(planId, data);
}

async function deletePlan(planId) {
  return stripe.plans.del(planId);
}


module.exports = {
  getPlanIntervals,
  create: createPlan,
  list: getPlans,
  get: getPlan,
  update: updatePlan,
  delete: deletePlan
};
