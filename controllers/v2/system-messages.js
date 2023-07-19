const express = require('express');
const fs = require('fs');
const sql = require('../../services/db').getDB();

const router = express.Router();

/**
 * URL: /v2/system-messages
 * METHOD: GET
 * Description: GET system message templates
 */

router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const customerId = req.customerId;
  const limit = 20;
  const offset = parseInt(req.query.offset, 10) * limit;

  const sqlQuery = {
    params: [
      customerId,
      limit,
      offset
    ],
    raw: fs.readFileSync('sql/system-messages/get-system-message-templates.sql').toString()
  };

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows;
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/system-messages
 * METHOD: POST
 * Description: Create system message template
 */

router.post('/', (req, res) => {
  req.checkBody({
    title: {
      notEmpty: true
    },
    content: {
      notEmpty: true
    },
    statusId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const customerId = req.customerId;
  const adminId = req.administratorId;
  const statusId = req.body.statusId;
  const title = req.body.title;
  const content = req.body.content;
  const userAgent = req.headers['user-agent'];

  const sqlQuery = {
    params: [
      customerId,
      adminId,
      statusId,
      title,
      content,
      JSON.stringify(userAgent)
    ],
    raw: fs.readFileSync('sql/system-messages/create-system-message-template.sql').toString()
  };

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows[0].value;
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});

/**
 * URL: /v2/system-messages/:messageId
 * METHOD: PUT
 * Description: Update system message template
 */

router.put('/:messageId', (req, res) => {
  req.checkBody({
    title: {
      notEmpty: true
    },
    content: {
      notEmpty: true
    },
    statusId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkParams({
    messageId: {
      notEmpty: true,
      isNumber: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const customerId = req.customerId;
  const messageId = req.params.messageId;
  const adminId = req.administratorId;
  const statusId = req.body.statusId;
  const title = req.body.title;
  const content = req.body.content;
  const userAgent = req.headers['user-agent'];

  const sqlQuery = {
    params: [
      customerId,
      messageId,
      adminId,
      statusId,
      title,
      content,
      JSON.stringify(userAgent)
    ],
    raw: fs.readFileSync('sql/system-messages/update-system-message-template.sql').toString()
  };

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows[0].value;
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/system-messages/:messageId
 * METHOD: GET
 * Description: GET system message template
 */

router.get('/:messageId', (req, res) => {
  req.checkParams({
    messageId: {
      notEmpty: true,
      isNumber: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const customerId = req.customerId;
  const messageId = req.params.messageId;

  const sqlQuery = {
    params: [
      customerId,
      messageId
    ],
    raw: fs.readFileSync('sql/system-messages/get-system-message-template.sql').toString()
  };

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows[0];
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/system-messages/:messageId
 * METHOD: DELETE
 * Description: Delete system message template
 */

router.delete('/:messageId', (req, res) => {
  req.checkParams({
    messageId: {
      notEmpty: true,
      isNumber: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const customerId = req.customerId;
  const messageId = req.params.messageId;
  const adminId = req.administratorId;
  const userAgent = req.headers['user-agent'];

  const sqlQuery = {
    params: [
      customerId,
      messageId,
      adminId,
      JSON.stringify(userAgent)
    ],
    raw: fs.readFileSync('sql/system-messages/delete-system-message-template.sql').toString()
  };

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows[0].value;
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


module.exports = router;
