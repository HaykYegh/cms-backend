module.exports = {
  insert(administratorId, key, value, callback) {
    if (!key) {
      return callback('MISSING_ACTION', null);
    }
    if (!value) {
      return callback('MISSING_RAW', null);
    }

    const action = parseInt(key, 10);
    if (isNaN(action)) {
      return callback('INVALID_ACTION', null);
    }
    const raw = JSON.stringify(value);

    global.sql.first('insert-activity', [action, raw, administratorId], (err, result) => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, result);
    });
  },

  get(logId, callback) {
    if (!logId) {
      return callback('MISSING_LOG_ID', null);
    }
    const activityId = parseInt(logId, 10);
    global.sql.first('get-activity', [activityId], (err, result) => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, result);
    });
  },


};

