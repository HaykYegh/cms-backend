INSERT INTO sticker.package_platforms (package_id, platform_id) SELECT $1 as package_id, pl::INTEGER as platform_id FROM json_array_elements_text($2) pl;