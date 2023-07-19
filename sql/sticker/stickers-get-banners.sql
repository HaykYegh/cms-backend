SELECT p.package_id,        CAST(p.package AS INTEGER) AS package_code,  p.config, p.copyright
FROM sticker.packages p
INNER JOIN sticker.package_platforms pp ON p.package_id = pp.package_id AND pp.platform_id=$2
WHERE p.package_status_id = 3 AND p.customer_id = $1
ORDER BY p.package_id DESC LIMIT $3;