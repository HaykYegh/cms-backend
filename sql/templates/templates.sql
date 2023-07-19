SELECT
  template_id,
  subject,
  content,
  params
FROM internal.templates
WHERE active=TRUE ORDER BY template_id ASC;