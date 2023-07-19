const express = require('express');

const router = express.Router();

/*
 * URL: /v1/templates
 * METHOD: GET
 * Description: GET email templates
 */

router.get('/', (req, res) => {
  global.sql.run('templates', [], (err, templates) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select templates',
      };
      return res.status(500).json(error).send();
    }

    return res.status(200).json({ err: false, result: templates }).send();
  });
});

/*
 * URL: /v1/templates/:templateId
 * METHOD: GET
 * Description: GET specific email template
 */

router.get('/:templateId', (req, res) => {
  req.checkParams({
    templateId: {
      notEmpty: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const templateID = parseInt(req.params.templateId, 10);

  global.sql.run('template', [templateID], (err, template) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select template',
      };
      return res.status(500).json(error).send();
    }

    return res.status(200).json({ err: false, result: template }).send();
  });
});

/*
 * URL: /v1/templates/:templateId
 * METHOD: PUT
 * Description: PUT specific email template
 */

router.put('/:templateId', (req, res) => {
  req.checkParams({
    templateId: {
      notEmpty: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const templateID = parseInt(req.params.templateId, 10);

  global.sql.run('template-update', [templateID, req.body.subject, req.body.content, req.body.params], (err, result) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable update template, template does\'t exist',
      };
      return res.status(404).json(error).send();
    }

    return res.status(200).json({ err: false, result }).send();
  });
});

module.exports = router;
