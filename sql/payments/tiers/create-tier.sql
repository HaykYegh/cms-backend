INSERT INTO stripe.tiers(tier_group_id, unit_id, up_to_number, amount, created_at, updated_at)
VALUES ($1, 1, $2, $3, NOW(), NOW())
ON CONFLICT (tier_group_id, up_to_number) DO UPDATE SET amount = $3, updated_at = NOW()
    RETURNING tier_id AS "tierId", up_to_number AS "upToNumber", amount, updated_at AS "updatedAt";

