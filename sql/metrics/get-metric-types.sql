SELECT mt.metric_type_id AS "metricTypeId", mt.name,
       json_agg(
         json_build_object('metricContextTypeId', mct.metric_context_type_id, 'name', mct.name)) AS "metricContextTypes"
FROM metrics.metric_types mt
       LEFT JOIN metrics.metric_context_types mct ON mt.metric_type_id = mct.parent_metric_type_id
GROUP BY mt.metric_type_id
ORDER BY "metricTypeId";