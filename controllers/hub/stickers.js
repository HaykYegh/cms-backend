const express = require('express');
const config = require('config');
const redis = require('redis').createClient(config.get('redis'));

const router = express.Router();


const enableCache = false;

router.get('/metas', (req, res) => {
  const customerId = req.user.customerId;
  const prefix = req.user.prefix;
  const hkey = `${prefix}#stickers`;
  const platformId = req.user.platform ? req.user.platform.platformId : null;

  global.async.parallel({
    categories(callback) {
      const key = 'categories';
      redis.hget(hkey, key, ((err, reply) => {
        if (err) {
          callback(err, null);
        }
        if (reply && enableCache) {
          const cacheReply = JSON.parse(reply);
          return callback(null, cacheReply);
        }
        global.sql.run('stickers-get-categories', [customerId], (err, result) => {
          if (err) {
            return callback(err, null);
          }
          if (enableCache) {
            return callback(null, result);
          }
          redis.hset(hkey, key, JSON.stringify(result), ((err) => {
            if (err) {
              callback(err, null);
            }
            callback(null, result);
          }));
        });
      }));
    },
    countries(callback) {
      const key = 'countries';
      redis.hget(hkey, key, ((err, reply) => {
        if (err) {
          callback(err, null);
        }
        if (reply && enableCache) {
          const cacheReply = JSON.parse(reply);
          return callback(null, cacheReply);
        }
        global.sql.run('stickers-get-countries', [customerId], (err, result) => {
          if (err) {
            return callback(err, null);
          }
          if (enableCache) {
            return callback(null, result);
          }
          redis.hset(hkey, key, JSON.stringify(result), ((err) => {
            if (err) {
              callback(err, null);
            }
            return callback(null, result);
          }));
        });
      }));
    },
    banners(callback) {
      const key = 'banners';
      redis.hget(hkey, key, ((err, reply) => {
        if (err) {
          callback(err, null);
        }
        if (reply && enableCache) {
          const cacheReply = JSON.parse(reply);
          return callback(null, cacheReply);
        }
        const limit = platformId === 2 ? 5 : 10;
        global.sql.run('stickers-get-banners', [customerId, platformId, limit], (err, result) => {
          if (err) {
            return callback(err, null);
          }
          if (enableCache) {
            return callback(null, result);
          }
          redis.hset(hkey, key, JSON.stringify(result), ((err) => {
            if (err) {
              callback(err, null);
            }
            return callback(null, result);
          }));
        });
      }));
    }
  }, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ error: true, errorMessage: 'DATA_FETCH_ERROR' }).send();
    }
    return res.status(200).json({ error: false, result }).send();
  });
});

router.get('/countries', (req, res) => {
  const customerId = req.user.customerId;
  const prefix = req.user.prefix;
  const key = 'countries';
  const hkey = `${prefix}#stickers`;
  redis.hget(hkey, key, ((err, reply) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ error: true, errorMessage: 'REDIS_HGET_ERROR', result: err }).send();
    }
    if (reply && enableCache) {
      const cacheReply = JSON.parse(reply);
      return res.status(200).json({ error: false, result: cacheReply }).send();
    }
    global.sql.run('stickers-get-countries', [customerId], (err, result) => {
      if (err) {
        global.log.error(err);
        return res.status(200).json({ error: true, errorMessage: 'DB_GET_ERROR', result: err }).send();
      }
      if (enableCache) {
        return res.status(200).json({ error: false, result }).send();
      }
      redis.hset(hkey, key, JSON.stringify(result), ((err) => {
        if (err) {
          global.log.error(err);
          return res.status(200).json({ error: true, errorMessage: 'REDIS_HSET_ERROR', result: err }).send();
        }
        return res.status(200).json({ error: false, result }).send();
      }));
    });
  }));
});


router.get('/categories', (req, res) => {
  const customerId = req.user.customerId;
  const prefix = req.user.prefix;
  const hkey = `${prefix}#stickers`;
  const key = 'categories';
  redis.hget(hkey, key, ((err, reply) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ error: true, errorMessage: 'REDIS_HGET_ERROR', result: err }).send();
    }
    if (reply && enableCache) {
      const cacheReply = JSON.parse(reply);
      return res.status(200).json({ error: false, result: cacheReply }).send();
    }
    global.sql.run('stickers-get-categories', [customerId], (err, result) => {
      if (err) {
        global.log.error(err);
        return res.status(200).json({ error: true, errorMessage: 'DB_GET_ERROR', result: err }).send();
      }
      if (enableCache) {
        return res.status(200).json({ error: false, result }).send();
      }
      redis.hset(hkey, key, JSON.stringify(result), ((err) => {
        if (err) {
          global.log.error(err);
          return res.status(200).json({ error: true, errorMessage: 'REDIS_HSET_ERROR', result: err }).send();
        }
        return res.status(200).json({ error: false, result }).send();
      }));
    });
  }));
});


router.get('/banners', (req, res) => {
  const customerId = req.user.customerId;
  const prefix = req.user.prefix;
  const hkey = `${prefix}#stickers`;
  const key = 'banners';
  redis.hget(hkey, key, ((err, reply) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ error: true, errorMessage: 'REDIS_HGET_ERROR', result: err }).send();
    }
    if (reply && enableCache) {
      const cacheReply = JSON.parse(reply);
      return res.status(200).json({ error: false, result: cacheReply }).send();
    }

    global.sql.run('stickers-get-banners', [customerId], (err, result) => {
      if (err) {
        global.log.error(err);
        return res.status(200).json({ error: true, errorMessage: 'DB_GET_ERROR', result: err }).send();
      }
      if (enableCache) {
        return res.status(200).json({ error: false, result }).send();
      }
      redis.hset(hkey, key, JSON.stringify(result), ((err) => {
        if (err) {
          global.log.error(err);
          return res.status(200).json({ error: true, errorMessage: 'REDIS_HSET_ERROR', result: err }).send();
        }
        return res.status(200).json({ error: false, result }).send();
      }));
    });
  }));
});

router.get('/', (req, res) => {
  req.checkQuery({
    category_id: {
      notEmpty: true,
      isNumber: true
    },
    country_id: {
      notEmpty: true,
      isNumber: true
    },
    offset: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }
  const limit = 50;
  const offset = req.query.offset * limit;

  const customerId = req.user.customerId;
  const categoryId = req.query.category_id > 0 ? parseInt(req.query.category_id, 10) : null;
  const countryId = req.query.country_id > 0 ? parseInt(req.query.country_id, 10) : null;
  const platformId = req.user.platform ? req.user.platform.platformId : null;

  const sqlParams = [customerId, categoryId, countryId, platformId, limit, offset];

  global.sql.run('stickers-get-all', sqlParams, (err, stickers) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ error: true, errorMessage: 'unable get stickers' }).send();
    }
    return res.status(200).json({ err: false, result: stickers }).send();
  });
});


router.get('/:sticker_id', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const customerId = req.user.customerId;
  const stickerId = req.params.sticker_id;

  const sqlParams = [customerId, stickerId];

  global.sql.first('stickers-get-one', sqlParams, (err, sticker) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ error: true, errorMessage: 'unable get sticker' }).send();
    }
    return res.status(200).json({ err: false, result: sticker }).send();
  });
});

module.exports = router;
