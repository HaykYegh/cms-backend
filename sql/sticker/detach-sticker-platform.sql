DELETE
FROM sticker.package_platforms
WHERE platform_id = $3 AND
        package_id = (SELECT p.package_id FROM sticker.packages p WHERE p.package_id = $2 AND p.customer_id = $1);