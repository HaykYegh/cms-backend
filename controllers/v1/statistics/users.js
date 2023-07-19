const express = require('express');
const async = require('async');
const fs = require('fs');
const sql = require('../../../services/db').getDB();
const ip = require('ip');

const router = express.Router();

router.get('/', (req, res) => {
  const sqlParams = [req.customerId];

  let ips = {};
  let dif = 0;

  if (fs.existsSync('ips.txt')) {
    const ipsStr = fs.readFileSync('ips.txt', 'utf8');
    ips = JSON.parse(ipsStr);
  }

  if (ips[ip.address()]) {
    dif = Date.now() - ips[ip.address()].time;
    const chacker = dif / 1000 / 60;
    if (chacker <= 10) {
      return res.status(200)
        .json({
          err: false, result: ips[ip.address()].result, chacker
        })
        .send();
    }
  }

  global.sql.first('get-all-users-count', sqlParams, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({
        err: true,
        err_msg: err,
      }).send();
    }
    ips[ip.address()] = {
      time: Date.now(),
      result
    };
    const ipsSrting = JSON.stringify(ips);

    return fs.writeFile('ips.txt', ipsSrting, function (err) {
      if (err) return console.log(err);
      console.log('Hello World > helloworld.txt');
      return res.status(200)
        .json({
          err: false, result
        })
        .send();
    });
  });
});

router.get('/count', (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
    },
    endDate: {
      notEmpty: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const customerId = req.customerId;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  async.parallel({
    unregisteredCount(callback) {
      const sqlQuery = {
        params: [
          customerId,
          startDate,
          endDate
        ],
        raw: fs.readFileSync('sql/statistics/get-unregistered-users-count.sql').toString()
      };

      sql.query(sqlQuery.raw, sqlQuery.params)
        .then((res) => {
          callback(null, res.rows);
        })
        .catch((e) => {
          console.log('### sqlQuery ###');
          console.log(sqlQuery);
          console.log(e);
          callback('DB_ERROR', null);
        });
    },
    registeredCount(callback) {
      const sqlQuery = {
        params: [
          customerId,
          startDate,
          endDate
        ],
        raw: fs.readFileSync('sql/statistics/get-registered-users-count.sql').toString()
      };
      sql.query(sqlQuery.raw, sqlQuery.params)
        .then((res) => {
          callback(null, res.rows);
        })
        .catch((e) => {
          console.log('### sqlQuery ###');
          console.log(sqlQuery);
          console.log(e);
          callback('DB_ERROR', null);
        });
    }
  }, (err, results) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR', result: err }).send();
    }
    return res.status(200).json({ err: false, result: results }).send();
  });
});

router.get('/platform/:platform_id', (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
    },
    endDate: {
      notEmpty: true,
    },
  });
  req.checkParams({
    platform_id: {
      notEmpty: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const sqlParams = [req.customerId, startDate, endDate];


  global.sql.first('get-users-count-by-platform', sqlParams, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({
        err: true,
        err_msg: err,
      }).send();
    }
    return res.status(200)
      .json({
        err: false,
        result
      })
      .send();
  });
});


router.get('/countries', (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
    },
    endDate: {
      notEmpty: true,
    },
    type: {
      optional: true,
      isString: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const type = req.query.type || 'ALL';


  console.log("type####");
  console.log(type);


  const sqlParams = [req.customerId, startDate, endDate, type];

  global.sql.run('get-users-data-by-country', sqlParams, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({
        err: true,
        err_msg: err,
      }).send();
    }
    return res.status(200)
      .json({
        err: false,
        result
      })
      .send();
  });
});

router.get('/total/registrations', (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
    },
    endDate: {
      notEmpty: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const sqlParams = [req.customerId, startDate, endDate];

  global.sql.run('get-users-chart-data', sqlParams, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({
        err: true,
        err_msg: err,
      }).send();
    }
    return res.status(200)
      .json({
        err: false,
        result
      })
      .send();
  });
});


router.get('/:country_id/registrations', (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
    },
    endDate: {
      notEmpty: true,
    },
  });
  req.checkParams({
    country_id: {
      notEmpty: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const countryId = req.params.country_id;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const sqlParams = [req.customerId, countryId, startDate, endDate];

  global.sql.run('get-users-chart-data-by-country', sqlParams, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({
        err: true,
        err_msg: err,
      }).send();
    }
    return res.status(200)
      .json({
        err: false,
        result
      })
      .send();
  });
});


module.exports = router;
