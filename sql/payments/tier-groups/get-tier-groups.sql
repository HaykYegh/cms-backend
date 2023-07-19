SELECT tier_group_id AS "tierGroupId", name
FROM stripe.tier_groups
ORDER BY tier_group_id DESC
LIMIT $1
OFFSET $2;