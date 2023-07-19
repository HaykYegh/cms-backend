SELECT
  a.attribute_id AS "attributeId",
  a.name         AS "attributeName",
  aa.value       AS value
FROM core.attributes a
  LEFT JOIN dashboard.administrator_attributes aa ON aa.attribute_id = a.attribute_id AND aa.administrator_id = $1
WHERE a.attribute_id IN (2, 3, 4, 8);
