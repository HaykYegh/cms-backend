SELECT tc.region_code AS "regionCode",
       tm.value AS "count",
       mt.metric_type_id AS "metricTypeId",
       mt.name AS "metricName",
       mct.metric_context_type_id AS "metricContextTypeId",
       mct.name AS "metricContextName",
       ct.created_at :: DATE AS "createdAt"
FROM metrics.timeline_metrics tm
       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.metric_types mt ON tm.metric_type_id = mt.metric_type_id
       INNER JOIN metrics.metric_context_types mct ON tm.metric_context_type_id = mct.metric_context_type_id
       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND ct.created_at::DATE BETWEEN $2::DATE AND $3::DATE AND ($4 :: INTEGER IS NULL OR tm.metric_type_id = $4) AND ($5 :: INTEGER IS NULL OR tm.metric_context_type_id = $5);
