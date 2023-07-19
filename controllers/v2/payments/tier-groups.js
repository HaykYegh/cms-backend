const express = require('express');
const sqlDB = require('../../../services/db');


const router = express.Router();


/**
 * URL: /v2/payments/tier-groups
 * METHOD: GET
 * Description: GET get tier groups sorted by date
 */

router.get('/', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;

  try {
    const sqlResult = await sqlDB.query('sql/payments/tier-groups/get-tier-groups.sql', [limit, offset]);
    const result = sqlResult.rows;
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


/**
 * URL: /v2/payments/tier-groups
 * METHOD: POST
 * Description: Create tier group
 */

router.post('/', async (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const { name } = req.body;
  try {
    const sqlResult = await sqlDB.query('sql/payments/tier-groups/create-tier-group.sql', [name]);
    const result = sqlResult.rows[0];
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


/**
 * URL: /v2/payments/tier-groups/:tierGroupId
 * METHOD: PUT
 * Description: Update tier group
 */

router.put('/:tierGroupId', async (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true,
      isString: true
    }
  });
  req.checkParams({
    tierGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const { name } = req.body;
  const { tierGroupId } = req.params;

  try {
    const sqlResult = await sqlDB.query('sql/payments/tier-groups/update-tier-group.sql', [tierGroupId, name]);
    const result = sqlResult.rows[0];
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});

/**
 * URL: /v2/payments/tier-groups/:tierGroupId
 * METHOD: GET
 * Description: get tier group
 */

router.get('/:tierGroupId', async (req, res) => {
  req.checkParams({
    tierGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const { tierGroupId } = req.params;

  try {
    const sqlResult = await sqlDB.query('sql/payments/tier-groups/get-tier-group.sql', [tierGroupId]);
    const result = sqlResult.rows[0];
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


/**
 * URL: /v2/payments/tier-groups/:tierGroupId
 * METHOD: DELETE
 * Description: Delete tier group
 */

router.delete('/:tierGroupId', async (req, res) => {
  req.checkParams({
    tierGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }
  const { tierGroupId } = req.params;
  try {
    const sqlResult = await sqlDB.query('sql/payments/tier-groups/delete-tier-group.sql', [tierGroupId]);
    const result = { deleted: !!sqlResult.rowCount };
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


/**
 * URL: /v2/payments/tierGroups/:tierGroupId/tiers
 * METHOD: GET
 * Description: GET get tiers sorted by number
 */

router.get('/:tierGroupId/tiers', async (req, res) => {
  req.checkParams({
    tierGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }
  const { tierGroupId } = req.params;

  try {
    const sqlResult = await sqlDB.query('sql/payments/tiers/get-tiers.sql', [tierGroupId]);
    const result = sqlResult.rows;
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error('### sqlQuery ###');
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


/**
 * URL: /v2/payments/tierGroups/:tierGroupId/tiers
 * METHOD: POST
 * Description: Create tier
 */

router.post('/:tierGroupId/tiers', async (req, res) => {
  req.checkBody({
    upToNumber: {
      notEmpty: true,
      isNumber: true
    },
    amount: {
      notEmpty: true,
      isFloatNumber: true
    }
  });
  req.checkParams({
    tierGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const { amount, upToNumber } = req.body;
  const { tierGroupId } = req.params;

  try {
    const sqlResult = await sqlDB.query('sql/payments/tiers/create-tier.sql', [tierGroupId, upToNumber, amount]);
    const result = sqlResult.rows[0];
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


/**
 * URL: /v2/payments/tierGroups/:tierGroupId/tiers/:tierId
 * METHOD: PUT
 * Description: Update tier
 */

router.put('/:tierGroupId/tiers/:tierId', async (req, res) => {
  req.checkBody({
    amount: {
      notEmpty: true,
      isFloatNumber: true
    }
  });
  req.checkParams({
    tierId: {
      notEmpty: true,
      isNumber: true
    },
    tierGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const { amount } = req.body;
  const { tierId, tierGroupId } = req.params;

  try {
    const sqlResult = await sqlDB.query('sql/payments/tiers/update-tier.sql', [tierGroupId, tierId, amount]);
    const result = sqlResult.rows[0];
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


/**
 * URL: /v2/payments/tierGroups/:tierGroupId/tiers/:tierId
 * METHOD: DELETE
 * Description: Delete tier
 */

router.delete('/:tierGroupId/tiers/:tierId', async (req, res) => {
  req.checkParams({
    tierId: {
      notEmpty: true,
      isNumber: true
    },
    tierGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const { tierId, tierGroupId } = req.params;

  try {
    const sqlResult = await sqlDB.query('sql/payments/tiers/delete-tier.sql', [tierGroupId, tierId]);
    const result = { deleted: sqlResult.rowCount > 0 };
    res.json({ err: false, result }).send();
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


module.exports = router;
