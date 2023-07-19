const express = require('express');

// const { activities } = require('../../services/sockets/emitter');
const activityService = require('../../services/activities');

const router = express.Router();


/**
 * URL: /v1/activities
 * METHOD: GET
 * Description: GET activities
 */

router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      optional: true,
    },
    action: {
      notEmpty: true,
    }
  });

  const query = req.query;
  if (!query.offset) {
    query.offset = 0;
  }
  const errors = req.validationErrors(true);
  if (errors) {
    return res.status(200).json({ err: true, err_msg: errors }).send();
  }

  global.sql.run('activities', [query.offset, query.action], (err, activities) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select activities',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: activities }).send();
  });
});

/**
 * URL: /v1/activities/actions
 * METHOD: GET
 * Description: GET activity actions
 */

router.get('/actions', (req, res) => {
  global.sql.run('get-activity-actions', (err, actions) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select actions',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: actions }).send();
  });
});

/**
 * URL: /v1/activities
 * METHOD: POST
 * Description: Create activity
 */

router.post('/', (req, res) => {
  const data = {
    user: {
      status: 1,
      userId: 325700,
      profile: { img: null, userId: 325700, lastName: null, firstName: null },
      password: '111222.g',
      username: '37422113347',
      createdAt: 1520339263000,
      phoneCode: '374',
      updatedAt: null,
      customerId: 1,
      userCountryId: 11,
      confirmationToken: null
    },
    deviceList: [],
    userAttempt: null,
    deviceRedisMap: {},
    zangiRoamingNumbers: []
  };
  activityService.insert(req.administrator.administratorId, 1, data, (err, result) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select actions',
      };
      return res.status(500).json(error).send();
    }
    activities.new(result.log_id);
    return res.status(200).json({ err: false, result }).send();
  });
});


module.exports = router;
