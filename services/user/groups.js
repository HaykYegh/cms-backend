const request = require('request');
const queryString = require('querystring');

const sql = require('../db');
const helpers = require('../../helpers');
const logger = require('../logger');
const customerService = require('../customers');


const usersQueries = require('../../sql/sql-queries');

const getConfig = helpers.billing.config;


function addGroupMembersToBilling({ customerId, userGroupId, members }) {
  return new Promise((resolve, reject) => {
    const billingConf = getConfig({ customerId });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }
    const requestUrl = `${billingConf.host}/jbilling/rest/json/setResellerToUsers`;
    const data = queryString.stringify({
      reseller: userGroupId === '-1' ? '' : userGroupId,
      usernameList: members,
    });

    request.post(requestUrl, {
      body: data,
      headers: {
        'Content-Length': data.length,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(e);
      }
      if (reply.error) {
        reject(result);
      } else {
        resolve(reply.result);
      }
    });
  });
}

function deleteGroupMemberFromBilling({ customerId, userGroupId, member }) {
  return new Promise((resolve, reject) => {
    const billingConf = getConfig({ customerId });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }
    const requestUrl = `${billingConf.host}/jbilling/rest/json/removeUserReseller`;
    const data = {
      reseller: userGroupId === -1 ? '' : userGroupId,
      username: member,
    };
    request.get(requestUrl, {
      qs: data
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(e);
      }
      if (reply.error) {
        reject(result);
      } else {
        resolve(reply.result);
      }
    });
  });
}


function deleteGroupFromBilling({ customerId, userGroupId, prefix }) {
  return new Promise((resolve, reject) => {
    const billingConf = getConfig({ customerId });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }
    const requestUrl = `${billingConf.host}/jbilling/rest/json/removeReseller`;
    const data = {
      reseller: userGroupId === -1 ? '' : userGroupId,
      prefix
    };
    request.get(requestUrl, {
      qs: data
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(e);
      }
      if (reply.error) {
        reject(result);
      } else {
        resolve(reply.result);
      }
    });
  });
}

// Group Management


async function getGroups(db, { customerId, name = null, limit, offset }) {
  const client = db || sql.getDB();
  const query = await client
    .query(usersQueries.usersV2.list.groups, [customerId, name, limit, offset]);
  return query.rows;
}

async function getGroupCount(db, { customerId, name = null }) {
  const client = db || sql.getDB();
  const query = await client
    .query(usersQueries.usersV2.count.groups, [customerId, name]);
  return query.rows[0] ? +query.rows[0].count : 0;
}


async function createGroup(db, { customerId, name }) {
  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.create.group,
    params: [customerId, name],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}

async function deleteGroup(db, { customerId, userGroupId }) {
  const client = db || sql.getDB();
  try {
    const { prefix } = customerService.get.customerId(customerId);
    await deleteGroupFromBilling({ customerId, userGroupId, prefix });
  } catch (e) {
    logger.error(e);
  }
  try {
    const query = {
      sql: usersQueries.usersV2.delete.group,
      params: [customerId, userGroupId],
    };
    const result = await client.query(query.sql, query.params);
    return {
      isDeleted: result.rowCount > 0
    };
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

async function getGroup(db, { customerId, userGroupId }) {
  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.retrieve.group,
    params: [customerId, userGroupId],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}

async function updateGroup(db, { customerId, userGroupId, name }) {
  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.update.group,
    params: [customerId, userGroupId, name],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}


// Group Member Management

async function createGroupMembers(db, { customerId, userGroupId, numbers }) {
  const client = db || sql.getDB();
  const transaction = await client.connect();

  try {
    await transaction.query('BEGIN');
    logger.info('> Transaction began');

    const { prefix } = customerService.get.customerId(customerId);
    const members = numbers.map((val) => {
      const number = val.startsWith('+') ? val.replace('+', '') : val;
      return `${prefix}${number}`;
    });

    try {
      await addGroupMembersToBilling({ customerId, userGroupId, members });
    } catch (e) {
      console.log(e);
    }

    const query = {
      sql: '',
      params: [],
    };
    if (+userGroupId === -1) {
      query.sql = usersQueries.usersV2.delete.members;
      query.params = [customerId, JSON.stringify(members)];
    } else {
      query.sql = usersQueries.usersV2.create.members;
      query.params = [userGroupId, JSON.stringify(members)];
    }

    const result = await client.query(query.sql, query.params);

    await transaction.query('COMMIT');
    return result.rows;
  } catch (e) {
    await transaction.query('ROLLBACK');
    throw e;
  } finally {
    transaction.release();
  }
}


async function getGroupMembers(db, { customerId, userGroupId, limit, offset }) {
  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.list.members,
    params: [customerId, userGroupId, limit, offset],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows;
}

async function getGroupMembersNumbers(db, { customerId, userGroupId }) {
  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.list.membersNumbers,
    params: [customerId, userGroupId],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows;
}

async function getGroupMember(db, { customerId, userGroupId, memberId }) {
  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.retrieve.member,
    params: [customerId, userGroupId, memberId],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}


async function getGroupMembersCount(db, { customerId, userGroupId }) {
  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.count.members,
    params: [customerId, userGroupId],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0] ? +result.rows[0].count : 0;
}


async function deleteGroupMember(db, { customerId, userGroupId, memberId }) {
  const client = db || sql.getDB();
  const transaction = await client.connect();

  try {
    await transaction.query('BEGIN');
    logger.info('> Transaction began');
    const groupMember = await getGroupMember(client, { customerId, userGroupId, memberId });

    const { prefix } = customerService.get.customerId(customerId);
    const member = prefix + groupMember.number;

    await deleteGroupMemberFromBilling({ customerId, userGroupId, member });
    const query = {
      sql: usersQueries.usersV2.delete.member,
      params: [customerId, userGroupId, memberId],
    };
    const result = await client.query(query.sql, query.params);
    return {
      isDeleted: result.rowCount > 0
    };
  } catch (e) {
    logger.error(e);
    await transaction.query('ROLLBACK');
    throw e;
  } finally {
    transaction.release();
  }
}

async function getUserGroups(db, { customerId, userId, limit, offset }) {
  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.list.userGroups,
    params: [customerId, userId, limit, offset],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows;
}

module.exports = {
  list: {
    groups: getGroups,
    groupMembersNumbers: getGroupMembersNumbers,
    groupMembers: getGroupMembers,
    userGroups: getUserGroups
  },
  create: {
    group: createGroup,
    groupMembers: createGroupMembers
  },
  count: {
    groups: getGroupCount,
    groupMembers: getGroupMembersCount
  },
  delete: {
    group: deleteGroup,
    groupMember: deleteGroupMember
  },
  retrieve: {
    group: getGroup,
    groupMember: getGroupMember
  },
  update: {
    group: updateGroup
  }
};
