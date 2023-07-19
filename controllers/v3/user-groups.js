const express = require('express');
const userGroupService = require('../../services/user/groups');
const gatewayService = require('../../services/gatewayV2');
const logger = require('../../services/logger');


const router = express.Router();


/**
 * URL: /v3/user-groups/:userGroupId/back-term-price
 * METHOD: GET
 * Description: Get back termination prices
 */

router.get('/:userGroupId/back-term-price', async (req, res) => {
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const userGroupId = req.params.userGroupId;

  try {
    const result = await gatewayService
      .gateways
      .retrieve
      .backTerminationPrice({ customerId, userGroupId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups/:userGroupId/back-term-price
 * METHOD: POST
 * Description: Update back termination price
 */

router.post('/:userGroupId/back-term-price', async (req, res) => {
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    amount: {
      optional: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const userGroupId = req.params.userGroupId;
  const amount = req.body.amount || 0;

  try {
    const result = await gatewayService
      .gateways
      .update
      .backTerminationPrice({ customerId, userGroupId, amount });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups
 * METHOD: GET
 * Description: GET user groups
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
    },
    name: {
      optional: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;
  const customerId = req.customerId;
  const name = req.query.name;

  try {
    const result = await userGroupService.list.groups(null, { customerId, name, limit, offset });
    result.push({
      name: 'DEFAULT GROUP',
      userGroupId: -1
    });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups/count
 * METHOD: GET
 * Description: Get user group count
 */

router.get('/count', async (req, res) => {
  req.checkQuery({
    name: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const name = req.query.name;

  try {
    const result = await userGroupService.count.groups(null, { customerId, name });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups/:userGroupId
 * METHOD: GET
 * Description: Get user group
 */

router.get('/:userGroupId', async (req, res) => {
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const userGroupId = req.params.userGroupId;

  try {
    const result = await userGroupService.retrieve.group(null, { customerId, userGroupId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v3/user-groups
 * METHOD: POST
 * Description: Create user group
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
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const name = req.body.name;

  try {
    const result = await userGroupService.create.group(null, { customerId, name });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups/:userGroupId
 * METHOD: PUT
 * Description: Update user group
 */

router.put('/:userGroupId', async (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true,
      isString: true
    }
  });
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const userGroupId = req.params.userGroupId;
  const name = req.body.name;

  try {
    const result = await userGroupService.update.group(null, { customerId, userGroupId, name });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups/:userGroupId
 * METHOD: DELETE
 * Description: Delete user group
 */

router.delete('/:userGroupId', async (req, res) => {
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const userGroupId = req.params.userGroupId;

  try {
    const result = await userGroupService.delete.group(null, { customerId, userGroupId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups/:userGroupId/members
 * METHOD: GET
 * Description: GET user group members
 */

router.get('/:userGroupId/members', async (req, res) => {
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
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;
  const customerId = req.customerId;
  const userGroupId = +req.params.userGroupId === -1 ? null: +req.params.userGroupId;

  try {
    const result = await userGroupService
      .list
      .groupMembers(null, { customerId, userGroupId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v3/user-groups/:userGroupId/members/count
 * METHOD: GET
 * Description: GET user group members count
 */

router.get('/:userGroupId/members/count', async (req, res) => {
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const userGroupId = req.params.userGroupId;

  try {
    const result = await userGroupService
      .count
      .groupMembers(null, { customerId, userGroupId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups/:userGroupId/members
 * METHOD: POST
 * Description: Create user group members
 */

router.post('/:userGroupId/members', async (req, res) => {
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    numbers: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const userGroupId = req.params.userGroupId;
  const numbers = req.body.numbers;

  try {
    const result = await userGroupService
      .create
      .groupMembers(null, { customerId, userGroupId, numbers });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/user-groups/:userGroupId/members/:memberId
 * METHOD: POST
 * Description: Create user group members
 */

router.delete('/:userGroupId/members/:memberId', async (req, res) => {
  req.checkParams({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    },
    memberId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const userGroupId = req.params.userGroupId;
  const memberId = req.params.memberId;

  try {
    const result = await userGroupService
      .delete
      .groupMember(null, { customerId, userGroupId, memberId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
