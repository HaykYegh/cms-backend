SELECT tier_id AS "tierId", tier_group_id AS "tierGroupId", up_to_number AS "upToNumber", amount,
       updated_at AS "updatedAt"
FROM stripe.tiers WHERE tier_group_id=$1 ORDER BY up_to_number ASC;
