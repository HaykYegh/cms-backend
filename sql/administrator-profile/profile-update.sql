INSERT INTO dashboard.administrator_attributes (administrator_id, attribute_id, value) VALUES ($1, $2, $3)
ON CONFLICT(administrator_id, attribute_id) DO UPDATE SET value = $3;