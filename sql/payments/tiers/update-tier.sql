UPDATE stripe.tiers
SET amount =$3, updated_at = NOW()
WHERE tier_group_id = $1 AND tier_id = $2
RETURNING tier_id AS "tierId", up_to_number AS "upToNumber", amount, updated_at AS "updatedAt";
