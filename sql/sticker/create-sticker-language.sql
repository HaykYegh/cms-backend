INSERT INTO sticker.package_languages(package_id, language_id, title, introduction, description, tags)
SELECT package_id, $3 AS language_id, $4 AS title, $5 AS introduction, $6 AS description, $7 AS tags
FROM sticker.packages
WHERE package_id = $2 AND customer_id = $1
ON CONFLICT (package_id, language_id) DO UPDATE SET title = $4, introduction = $5, description = $6, tags = $7 RETURNING package_language_id;
