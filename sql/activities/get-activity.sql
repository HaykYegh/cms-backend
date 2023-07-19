SELECT
  l.log_id,
  la.name AS action,
  l.raw,
  l.created_at,
  la.log_action_id
FROM utilities.logs l
  INNER JOIN utilities.log_actions la ON l.log_action_id = la.log_action_id
WHERE l.log_id=$1