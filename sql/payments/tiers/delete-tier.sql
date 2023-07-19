DELETE
FROM stripe.tiers
WHERE tier_id = (SELECT tier_id FROM stripe.tiers WHERE tier_group_id = $1 AND tier_id = $2);