INSERT INTO sticker.package_platforms(package_id, platform_id)
SELECT $1 AS package_id, v :: INT AS platform_id
FROM json_array_elements_text($2) v RETURNING package_platform_id;