const request = require('request');
const config = require('config');
const fs = require('fs');
const sql = require('./db');


const customerQueries = sql.queries.customers;

let customerIds = {};


const billingConf = config.get('billing');

const customers = {
  prefix: [],
  ids: [],
  values: {},
  hasPrefix(prefix) {
    return this.prefix.includes(prefix);
  },
  hasId(id) {
    return this.ids.includes(id);
  },
  getIds() {
    return this.ids;
  },
  getValues() {
    return this.ids;
  },
  getPrefixValues() {
    return this.prefix;
  },
  getValue(prefix) {
    return this.values[prefix];
  }
};
const setCustomers = (arr) => {
  for (let i = 0; i < arr.length; i++) {
    const customer = arr[i];
    customers.prefix.push(customer.prefix);
    customers.ids.push(customer.customerId);
    customers.values[customer.prefix] = arr[i];
  }
};
const setCustomer = (customer) => {
  customers.prefix.push(customer.prefix);
  customers.ids.push(customer.customerId);
  customers.values[customer.prefix] = customer;
  customerIds[customer.customerId] = {
    customerId: customer.customerId,
    name: customer.name,
    prefix: customer.prefix,
    currency: customer.currency,
    number: customer.number || null
  };
};
const getCustomers = () => customers;

const createBillingCustomer = ({ defaultNumber, defaultEmail, prefix, currency }) => (callback) => {
  const requestUrl = `${billingConf.host}/jbilling/rest/json/createAdminWithEmail`;
  const qs = {
    username: defaultNumber,
    prefix,
    reseller: '',
    currency,
    email: defaultEmail
  };
  request.get(requestUrl, {
    qs
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return callback(err);
    }
    let admin;
    try {
      admin = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return callback({ e, result });
    }
    callback(null, admin);
  });
};


const createCustomer = async (customer) => {
  const {
    name,
    businessNumber,
    email,
    prefix,
    currency,
    regionCode,
    packageId,
    trialEnd = 15,
    totalAttemptsCount,
    dailyAttemptsCount,
    password,
    customerName,
    phone,
    organizationSize
  } = customer;

  const client = await sql.getDB().connect();

  try {
    await client.query('BEGIN');
    const createCustomerQuery = {
      params: [
        packageId,
        name,
        regionCode,
        prefix,
        currency,
        businessNumber,
        trialEnd
      ],
      raw: fs.readFileSync('sql/customers/create-customer.sql').toString()
    };
    const customerSqlResult = await client.query(
      createCustomerQuery.raw, createCustomerQuery.params
    );
    const createdCustomer = customerSqlResult.rows[0];

    const profileQuery = {
      params: [
        createdCustomer.customerId,
        JSON.stringify([
          {
            attributeId: 2,
            value: customerName
          },
          {
            attributeId: 9,
            value: phone
          },
          {
            attributeId: 199,
            value: organizationSize
          }
        ])
      ],
      row: fs.readFileSync('sql/customer-profile/profile-create.sql').toString()
    };
    const profileSqlResult = await client.query(profileQuery.row, profileQuery.params);

    const customerLimitsQuery = {
      params: [
        createdCustomer.customerId,
        dailyAttemptsCount,
        totalAttemptsCount
      ],
      raw: fs.readFileSync('sql/customers/set-customer-limits.sql').toString()
    };
    const limitsSqlResult = await client.query(customerLimitsQuery.raw, customerLimitsQuery.params);

    const adminQuery = {
      params: [
        createdCustomer.customerId,
        email,
        password
      ],
      raw: fs.readFileSync('sql/customers/create-customer-default-admin.sql').toString()
    };
    const adminSqlResult = await client.query(adminQuery.raw, adminQuery.params);

    await client.query('COMMIT');

    setCustomer(createdCustomer);

    return {
      customer: createdCustomer,
      profile: profileSqlResult.rows,
      limits: limitsSqlResult.rows[0],
      admin: adminSqlResult.rows[0]
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};


async function updateCustomerStatus(db, { customerId, status }) {
  const client = db || sql.getDB();
  try {
    const sqlResult = await client.query(customerQueries.update.status, [
      customerId,
      status
    ]);

    return sqlResult.rows;
  } catch (e) {
    console.log(e);
  }
}


async function getCustomerList(db, { limit, offset }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(customerQueries.list.customers, [limit, offset]);
  return sqlResult.rows;
}


async function getCustomersCount(db) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(customerQueries.count.customers);
  return sqlResult.rows[0];
}


function createUniquePrefix() {
  const prefixes = getCustomers().prefix;
  const PRIMER = 'abcdefghijklmnopqrstuvwxyz'.split('');

  // eslint-disable-next-line no-restricted-syntax
  for (const i of PRIMER) {
    // eslint-disable-next-line no-restricted-syntax
    for (const j of PRIMER) {
      if (!prefixes.includes(i + j)) {
        return i + j;
      }
    }
  }

  return null;
}


module.exports = {
  customers,
  setCustomers,
  getCustomers,
  createCustomer,
  createUniquePrefix,
  createBillingCustomer,
  update: {
    customerStatus: updateCustomerStatus
  },
  set: {
    customerIds(ids) {
      customerIds = ids;
    }
  },
  get: {
    customerIds() {
      return customerIds;
    },
    customerId(id) {
      return customerIds[id];
    }
  },
  list: {
    customers: getCustomerList
  },
  count: {
    customers: getCustomersCount
  }
};
