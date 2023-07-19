SELECT pc.package_id, c2.name, c2.sort_name as region_code, c2.country_id
FROM sticker.package_countries pc
       INNER JOIN internal.countries c2 ON pc.country_id = c2.country_id
       INNER JOIN sticker.packages p ON p.package_id = pc.package_id
WHERE pc.package_id = $2 AND p.customer_id = $1;

