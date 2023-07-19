INSERT INTO sticker.package_countries(package_id, country_id)
SELECT $1 AS package_id, c.country_id AS country_id
FROM json_array_elements_text($2) v
       INNER JOIN internal.countries c ON v :: TEXT = c.sort_name
    RETURNING package_country_id;