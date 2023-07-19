INSERT INTO sticker.package_languages (package_id, language_id, title, introduction, description) SELECT $1 AS package_id,
       (l->>'language_id')::INTEGER AS language_id,
       (l->>'title') AS title,
       (l->>'introduction') AS introduction,
       (l->>'description') AS description
FROM json_array_elements($2) l;