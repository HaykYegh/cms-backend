SELECT uc.user_contacts
FROM backend.user_contacts uc
  INNER JOIN backend.users u ON uc.user_id = u.user_id
WHERE uc.user_id = $2 AND u.customer_id=$1;