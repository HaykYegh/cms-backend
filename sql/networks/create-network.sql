INSERT INTO virtual_network.networks(customer_id, nickname, label, call_name, description, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING network_id AS "networkId";