INSERT INTO sticker.package_category_map(package_id, category_id)
SELECT $1 AS package_id, v::INT AS category_id
FROM json_array_elements_text($2) v
ON CONFLICT (package_id, category_id) DO UPDATE SET category_id = EXCLUDED.category_id RETURNING package_category_id;
