SELECT DISTINCT c2.country_id AS country_id,
       c2.sort_name AS "region_code",
       c2.name AS country_name
FROM sticker."package_countries" pc
       INNER JOIN sticker.packages p ON pc.package_id = p.package_id
       INNER JOIN internal.countries c2 ON pc.country_id = c2.country_id
WHERE p.package_status_id = 3 AND p.customer_id = $1;