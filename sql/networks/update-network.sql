UPDATE virtual_network.networks
SET name = $3, description = $4, updated_at = now()
WHERE customer_id = $1 AND network_id = $2 RETURNING updated_at AS "updatedAt";