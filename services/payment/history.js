const moment = require('moment-timezone');
const paymentCustomerService = require('./customer');
const paymentPriceService = require('./price');
const paymentInvoiceService = require('./invoice');
const userService = require('../user');
const logger = require('../logger');
const utils = require('../../helpers/utils');
const { PAYMENTS: { HISTORY_TYPES } } = require('../../helpers/constants');


function getRegisteredDays({ users, killedUsers, searchDate, numberOfDaysInMonth }) {
  const registeredDays = {};

  for (const user of users) {
    const createdAt = moment(user.createdAt);
    const isSameMonth = searchDate.isSame(createdAt, 'month');

    if (isSameMonth) {
      const days = (numberOfDaysInMonth - createdAt.format('DD') + 1);
      if (!registeredDays[days]) {
        registeredDays[days] = 0;
      }
      registeredDays[days]++;
    } else {
      if (!registeredDays[numberOfDaysInMonth]) {
        registeredDays[numberOfDaysInMonth] = 0;
      }
      registeredDays[numberOfDaysInMonth]++;
    }
  }
  for (const user of killedUsers) {
    const createdAt = moment(user.createdAt);
    const deletedAt = moment(user.deletedAt);
    const isSameMonthDeleted = searchDate.isSame(deletedAt, 'month');

    if (isSameMonthDeleted) {
      const days = (deletedAt.get('date') - createdAt.get('date')) + 1;
      if (!registeredDays[days]) {
        registeredDays[days] = 0;
      }
      registeredDays[days]++;
    }
  }

  return registeredDays;
}

async function getAllUsers({ customerId, year, month }) {
  const OFFSET = 0;
  const LIMIT = 99999999999;
  const userParams = {
    offset: OFFSET,
    limit: LIMIT,
    customerId,
    registrationStartDate: moment(`${year - 100}-${month}-01`, 'YYYY-MM-DD').format('YYYY-MM-DD'),
    registrationEndDate: moment(`${year}-${month}`, 'YYYY-MM').endOf('month').format('YYYY-MM-DD')
  };
  const killedUserParams = {
    customerId,
    registrationStartDate: moment(`${year}-${month}-01`, 'YYYY-MM-DD').format('YYYY-MM-DD'),
    registrationEndDate: moment(`${year}-${month}`, 'YYYY-MM').endOf('month').format('YYYY-MM-DD')
  };
  const users = await userService.users.getAll.records(userParams);
  const killedUsers = await userService.users.getAll.killedUsers(null, killedUserParams);
  return { users, killedUsers };
}

function getMonthlyFee({ daysRegisteredObj, numberOfDaysInMonth, oneUserPrice }) {
  let usedDays = 0;

  for (const days in daysRegisteredObj) {
    const userCount = daysRegisteredObj[days];
    usedDays += (userCount * days);
  }

  const usedMonths = Math.floor(usedDays / numberOfDaysInMonth);
  return String(usedMonths * oneUserPrice);
}

function getPaymentHistory(client, { customerId, year, month, searchType = HISTORY_TYPES.YEARLY }) {
  return new Promise(async (resolve, reject) => {
    try {
      const stripeCustomer = await paymentCustomerService.getByCustomerId(null, { customerId });
      if (!stripeCustomer) {
        return resolve([]);
      }
      const stripeCustomerId = stripeCustomer.stripeCustomerId;
      const price = await paymentPriceService.get(null, { priceId: stripeCustomer.priceId });
      const oneUserPrice = price.amount;
      const history = [];

      switch (searchType) {
        case HISTORY_TYPES.YEARLY: {
          const invoices = await paymentInvoiceService.list(null, { stripeCustomerId, year });

          for (const invoice of invoices) {
            const amount = String(invoice.totalAmount);
            history.push({
              date: moment(invoice.createdAt).format('MMM YYYY'),
              userCount: String(invoice.totalAmount).slice(0, -2) / oneUserPrice,
              monthlyFee: amount.slice(0, -2)
            });
          }

          logger.info(`history => ${JSON.stringify(history)}`);
          resolve(history);
          break;
        }
        case HISTORY_TYPES.MONTHLY: {
          const allUsers = await getAllUsers({ customerId, month, year });
          const searchDate = moment(`${year}-${month}`, 'YYYY-MM');
          const numberOfDaysInMonth = utils.daysInMonth({ year, month });
          const daysRegisteredObj = getRegisteredDays({
            users: allUsers.users,
            killedUsers: allUsers.killedUsers,
            searchDate,
            numberOfDaysInMonth
          });
          const monthlyFee = getMonthlyFee({
            daysRegisteredObj,
            numberOfDaysInMonth,
            oneUserPrice
          });
          const searchDateStr = searchDate.format('MMM YYYY');
          for (const days in daysRegisteredObj) {
            const userCount = daysRegisteredObj[days];
            history.push({
              date: searchDateStr,
              userCount,
              daysRegistered: days,
              monthlyFee
            });
          }

          resolve(history);
          break;
        }
        default:
          break;
      }
    } catch (error) {
      logger.error(error);
      reject(error);
    }
  });
}

module.exports = {
  get: {
    history: getPaymentHistory
  }
};
