SELECT a."administrator_id" AS "administratorId",
       a.customer_id AS "customerId",
       a.email AS "email",
       json_build_object(
         'customerId', ca.customer_id,
         'name', ca.name,
         'prefix', ca.prefix,
         'currency', ca.currency,
         'internalCurrency', ca.internal_currency,
         'customerBusinessNumber', ca.customer_business_number
           ) AS customer,
       json_agg(json_build_object('attributeId', at.attribute_id, 'attributeName', at.name, 'value', aa.value)) AS attributes,
       ar.role_id = 1 AS "isSuper",
       ca.trial_end AS "trialEnd"
FROM dashboard."administrators" a
       INNER JOIN customer."customers" ca
         ON ca."customer_id" = a."customer_id" AND ca.customer_status > 0 AND ca.active = TRUE
    LEFT JOIN core.attributes at ON at.attribute_id IN (2, 3, 4, 8)
    LEFT JOIN dashboard.administrator_attributes aa ON aa.attribute_id = at.attribute_id AND aa.administrator_id=a.administrator_id
    LEFT JOIN dashboard.administrator_roles ar ON a.administrator_id = ar.administrator_id
    LEFT JOIN virtual_network.network_admins na ON a.administrator_id = na.admin_id
    LEFT JOIN dashboard.channel_admins cha ON a.administrator_id = cha.admin_id
WHERE a."email" = $2 AND a.password = crypt($3, a.password) AND a."status" > 0 AND (
    CASE
        WHEN coalesce($1 , '') = ''
            THEN (ca.customer_package_id = 4)
        ELSE (ca.prefix = $1)
    END
    ) AND
    na.network_admin_id IS NULL AND cha.admin_id IS NULL
GROUP BY a.administrator_id, ca.customer_id, ar.role_id, na.network_admin_id;

