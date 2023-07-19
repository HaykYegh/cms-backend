SELECT
"template_id",
  subject,
  content,
  params
FROM internal.templates where "template_id"=$1