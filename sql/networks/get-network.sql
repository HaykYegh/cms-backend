SELECT network_id AS "networkId",
       nickname AS "nickname",
       label AS "label",
       description AS "description",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
FROM virtual_network.networks where customer_id=$1 AND network_id=$2;