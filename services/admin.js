const sql = require('./db');

const adminQueries = sql.queries.admin;


async function getAdminAttributes(db, { customerId, networkId = null, adminId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(adminQueries.get.attributes, [customerId, networkId, adminId]);
  return query.rows[0];
}


async function createOrReplaceAdminAttributes(db, { adminId, attributes }) {
  const client = db || sql.getDB();
  const query = await client.query(adminQueries.create.attributes,
    [adminId, JSON.stringify(attributes)]);
  return query.rows;
}


async function updateAdminPassword(db, params) {
  const client = db || sql.getDB();
  const { customerId, networkId = null, adminId, password } = params;
  const query = await client.query(adminQueries.update.password,
    [customerId, networkId, adminId, password]);
  if (!query.rows[0]) {
    throw new Error('PASSWORD_NOT_VERIFIED');
  }
  return query.rows[0];
}

async function deleteAdmin(db, { customerId, adminId }) {
  const client = db || sql.getDB();
  const query = await client.query('SELECT dashboard."deleteAdmin"($1, $2);', [customerId, adminId]);
  if (!query.rows[0]) {
    throw new Error('ERROR');
  }
  return query.rows[0];
}

async function createAdmin(db, { customerId, email, password, networkId }) {
  const client = db || sql.getDB();
  const query = await client.query('SELECT dashboard."createAdmin"($1, $2, $3, $4);', [customerId, email, password, networkId]);
  if (!query.rows[0]) {
    throw new Error('ERROR');
  }
  return query.rows[0];
}

async function createAdminRole(db, { adminRole, administratorId }) {
  const client = db || sql.getDB();
  const query = await client.query(adminQueries.create.adminRole, [adminRole, administratorId]);
  if (!query.rows[0]) {
    throw new Error('ERROR');
  }
  return query.rows[0];
}

async function getAdmins(db, { customerId, networkId = null, limit, offset }) {
  const client = db || sql.getDB();
  const query = await client.query(adminQueries.list.admins,
    [customerId, networkId, limit, offset]);
  return query.rows;
}

async function getAdminsCount(db, { customerId, networkId = null }) {
  const client = db || sql.getDB();
  const query = await client.query(adminQueries.count.admins, [customerId, networkId]);
  return +query.rows[0].count;
}

async function createChannelAdmin(db, { customerId, email, password, channelRoom }) {
  const client = db || sql.getDB();
  const query = await client.query('SELECT dashboard."createAdminChannel"($1, $2, $3, $4);', [customerId, email, password, channelRoom]);
  if (!query.rows[0]) {
    throw new Error('ERROR');
  }
  return query.rows[0];
}

async function getChannelAdmins(db, { customerId, channelRoom = null, limit, offset }) {
  const client = db || sql.getDB();
  const query = await client.query(adminQueries.list.channelAdmins,
    [customerId, channelRoom, limit, offset]);
  return query.rows;
}

async function getChannelAdminsCount(db, { customerId, channelRoom = null }) {
  const client = db || sql.getDB();
  const query = await client.query(adminQueries.count.channelAdmins, [customerId, channelRoom]);
  return +query.rows[0].count;
}

async function getAdminChannelAttributes(db, { customerId, channelId = null, adminId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(adminQueries.get.channelAdminAttributes, [customerId, channelId, adminId]);
  return query.rows[0];
}

async function getAdminByEmail(db, email) {
  const client = db || sql.getDB();
  const query = await client.query(adminQueries.get.adminByEmail, [email]);
  return query.rows[0];
}

module.exports = {
  get: {
    adminByEmail: getAdminByEmail,
  },
  profile: {
    getAttributes: getAdminAttributes,
    upsertAttributes: createOrReplaceAdminAttributes,
    updatePassword: updateAdminPassword,
    channelGetAttributes: getAdminChannelAttributes
  },
  delete: {
    admin: deleteAdmin
  },
  create: {
    admin: createAdmin,
    adminRole: createAdminRole,
    channelAdmin: createChannelAdmin
  },
  list: {
    admins: getAdmins,
    channelAdmins: getChannelAdmins
  },
  count: {
    admins: getAdminsCount,
    channelAdmins: getChannelAdminsCount
  }
};
