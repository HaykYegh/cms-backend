SELECT p.package_status_id, ps.name
FROM sticker.packages p
INNER JOIN sticker.package_statuses ps ON p.package_status_id = ps.package_status_id
 WHERE package_id=$2 AND customer_id=$1;