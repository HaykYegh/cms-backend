INSERT INTO sticker.package_category_map (package_id, category_id) SELECT $1 AS package_id, cat::INTEGER as category_id FROM json_array_elements_text($2) cat;
