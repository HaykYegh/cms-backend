SELECT tier_group_id AS "tierGroupId", name
FROM stripe.tier_groups WHERE tier_group_id=$1;