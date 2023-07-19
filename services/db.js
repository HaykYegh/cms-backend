const { Pool } = require('pg');
const config = require('config');
const sqlQueries = require('../sql/sql-queries');

const fs = require('fs');
const util = require('util');

const readFile = util.promisify(fs.readFile);

let pool = new Pool(config.get('postgres'));


module.exports = {
  getDB() {
    if (!pool) {
      pool = new Pool(config.get('postgres'));
    }
    return pool;
  },
  queries: sqlQueries,
  async query(path, params) {
    const queryBuffer = await readFile(path);
    const sqlQuery = {
      params,
      raw: queryBuffer.toString()
    };
    return this.getDB().query(sqlQuery.raw, sqlQuery.params);
  }
};
