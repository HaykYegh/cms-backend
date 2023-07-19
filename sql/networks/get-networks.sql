SELECT network_id AS "networkId",
       nickname AS "nickname",
       description AS "description",
       label AS "label",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
FROM virtual_network.networks where customer_id=$1 LIMIT $2 OFFSET $3;
