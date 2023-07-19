WITH customer_attributes AS (
    INSERT INTO customer.customer_attributes (customer_id, attribute_id, value)
        SELECT $1::INT AS customer_id, (k ->> 'attributeId')::INT AS attributeId, (k ->> 'value')::TEXT AS value
        FROM json_array_elements($2::JSON) k
        RETURNING *
)
SELECT ca.name AS attributeName, customer_attributes.value AS "value"
FROM customer_attributes
         INNER JOIN core.attributes ca ON ca.attribute_id = customer_attributes.attribute_id;
