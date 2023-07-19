UPDATE customer.customer_third_party_providers
SET deleted_at = NOW(), is_deleted = TRUE
WHERE customer_id = $1 AND customer_third_party_provider_id = $2
returning deleted_at as "deletedAt", is_deleted as "isDeleted";