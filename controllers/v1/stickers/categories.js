const express = require('express');
const config = require('config');
const redis = require('redis').createClient(config.get('redis'));

const router = express.Router();


/**
 * URL: /v1/stickers/categories
 * METHOD: GET
 * Description: get Sticker categories
 */
router.get('/', (req, res) => {
  global.sql.run('stickers-get-categories', [req.customerId], (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'DB_GET_ERROR', result: err }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});

/**
 * URL: /v1/stickers/categories
 * METHOD: POST
 * Description: create Sticker category
 */
router.post('/', (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true,
    },
    active: {
      notEmpty: true,
      isBoolean: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const hkey = `${prefix}#stickers`;
  const key = 'categories';


  const customerId = req.customerId;
  const name = req.body.name;
  const active = req.body.active;


  const sql = {
    params: [customerId, name, active]
  };


  global.sql.first('create-sticker-category', sql.params, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'DB_SET_ERROR', result: err }).send();
    }
    redis.hdel(hkey, key, ((err) => {
      if (err) {
        global.log.error(err);
        return res.status(200).json({ err: true, err_msg: 'REDIS_HDEL_ERROR', result: err }).send();
      }
      return res.status(200).json({ err: false, result }).send();
    }));
  });
});


/**
 * URL: /v1/stickers/categories/:package_category_id
 * METHOD: PUT
 * Description: update sticker category
 */
router.put('/:package_category_id', (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true,
    },
    active: {
      notEmpty: true,
      isBoolean: true
    }
  });
  req.checkParams({
    package_category_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const hkey = `${prefix}#stickers`;
  const key = 'categories';


  const customerId = req.customerId;
  const packageCategoryId = req.params.package_category_id;
  const name = req.body.name;
  const active = req.body.active;


  const sql = {
    params: [customerId, packageCategoryId, name, active]
  };

  global.sql.first('update-sticker-category', sql.params, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'DB_UPDATE_ERROR', result: err }).send();
    }
    redis.hdel(hkey, key, ((err) => {
      if (err) {
        global.log.error(err);
        return res.status(200).json({ err: true, err_msg: 'REDIS_HDEL_ERROR', result: err }).send();
      }
      return res.status(200).json({ err: false, result }).send();
    }));
  });
});


/**
 * URL: /v1/stickers/categories/:package_category_id
 * METHOD: DELETE
 * Description: delete sticker category
 */
router.delete('/:package_category_id', (req, res) => {
  req.checkParams({
    package_category_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const hkey = `${prefix}#stickers`;
  const key = 'categories';


  const customerId = req.customerId;
  const packageCategoryId = req.params.package_category_id;

  const sql = {
    params: [customerId, packageCategoryId]
  };

  global.sql.first('delete-sticker-category', sql.params, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'DB_DELETE_ERROR', result: err }).send();
    }
    redis.hdel(hkey, key, ((err) => {
      if (err) {
        global.log.error(err);
        return res.status(200).json({ err: true, err_msg: 'REDIS_HDEL_ERROR', result: err }).send();
      }
      return res.status(200).json({ err: false, result }).send();
    }));
  });
});

/**
 * URL: /v1/stickers/categories/:package_category_id
 * METHOD: GET
 * Description: get sticker category
 */
router.get('/:package_category_id', (req, res) => {
  req.checkParams({
    package_category_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }


  const customerId = req.customerId;
  const packageCategoryId = req.params.package_category_id;

  const sql = {
    params: [customerId, packageCategoryId]
  };

  global.sql.first('get-sticker-category', sql.params, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'DB_DELETE_ERROR', result: err }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


module.exports = router;
