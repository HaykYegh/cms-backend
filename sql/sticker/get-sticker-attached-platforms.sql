
SELECT pp.package_platform_id, pp.package_id, ip.name, pp.platform_id
FROM sticker.package_platforms pp
       INNER JOIN internal.platforms ip ON pp.platform_id = ip.platform_id
       INNER JOIN sticker.packages p ON p.package_id = pp.package_id
WHERE pp.package_id = $2 AND p.customer_id = $1;