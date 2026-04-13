-- Find duplicate non-reversed bill entries for same source_id
WITH dupes AS (
  SELECT source_id, MIN(created_at) as keep_ts, COUNT(*) as n
  FROM journal_entries
  WHERE source_type = 'bill'
  GROUP BY source_id
  HAVING COUNT(*) > 1
)
SELECT je.id, je.source_id, je.created_at,
       (SELECT keep_ts FROM dupes d WHERE d.source_id = je.source_id) as keeper
FROM journal_entries je
WHERE je.source_type = 'bill'
  AND je.source_id IN (SELECT source_id FROM dupes)
ORDER BY je.source_id, je.created_at;
