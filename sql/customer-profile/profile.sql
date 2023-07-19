SELECT
    a.attribute_id AS "attributeId",
    a.name AS "attributeName",
    ca.value AS "value"
FROM core.attributes a
         LEFT JOIN customer.customer_attributes ca ON a.attribute_id = ca.attribute_id AND ca.customer_id = $1::INT
WHERE a.attribute_id IN (2, 9, 199);
