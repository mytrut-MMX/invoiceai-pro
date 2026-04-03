-- Agent orchestration cleanup utilities.
-- 1) Automatic daily cleanup for completed objectives (+ related tasks).
-- 2) Manual cleanup function for objectives/tasks older than a caller-specified age.
--
-- NOTE: Existing agent_logs cleanup is intentionally left unchanged.

-- Ensure pg_cron is available for scheduled execution.
create extension if not exists pg_cron;

-- =====================================================================
-- A) AUTOMATIC CLEANUP FUNCTION (completed objectives/tasks only)
-- =====================================================================
create or replace function public.cleanup_completed_agent_work()
returns table (deleted_tasks bigint, deleted_objectives bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_tasks bigint := 0;
  v_deleted_objectives bigint := 0;
begin
  -- Delete tasks for completed objectives first.
  -- This is safe whether or not ON DELETE CASCADE exists.
  with deleted as (
    delete from public.agent_tasks t
    using public.agent_objectives o
    where t.objective_id = o.id
      and o.status = 'completed'
    returning 1
  )
  select count(*) into v_deleted_tasks from deleted;

  -- Delete only completed objectives (do NOT touch active statuses).
  with deleted as (
    delete from public.agent_objectives o
    where o.status = 'completed'
    returning 1
  )
  select count(*) into v_deleted_objectives from deleted;

  return query select v_deleted_tasks, v_deleted_objectives;
end;
$$;

comment on function public.cleanup_completed_agent_work is
  'Daily automatic cleanup: deletes completed objectives and their related tasks only.';

-- Daily job: run every day at 02:15 UTC.
-- Clear name so operators can identify purpose quickly.
select cron.unschedule(jobid)
from cron.job
where jobname = 'daily_cleanup_completed_agent_work';

select cron.schedule(
  'daily_cleanup_completed_agent_work',
  '15 2 * * *',
  $$select public.cleanup_completed_agent_work();$$
);

-- =====================================================================
-- B) MANUAL CLEANUP FUNCTION (older-than threshold)
-- =====================================================================
-- Primary manual function: accepts an INTERVAL.
create or replace function public.cleanup_old_agent_work_manual(p_age interval)
returns table (deleted_tasks bigint, deleted_objectives bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_tasks bigint := 0;
  v_deleted_objectives bigint := 0;
  v_cutoff timestamptz;
begin
  if p_age is null or p_age <= interval '0' then
    raise exception 'p_age must be a positive interval';
  end if;

  v_cutoff := now() - p_age;

  -- Delete tasks linked to objectives older than cutoff first.
  with deleted as (
    delete from public.agent_tasks t
    using public.agent_objectives o
    where t.objective_id = o.id
      and o.created_at < v_cutoff
    returning 1
  )
  select count(*) into v_deleted_tasks from deleted;

  -- Delete objectives older than cutoff.
  with deleted as (
    delete from public.agent_objectives o
    where o.created_at < v_cutoff
    returning 1
  )
  select count(*) into v_deleted_objectives from deleted;

  return query select v_deleted_tasks, v_deleted_objectives;
end;
$$;

comment on function public.cleanup_old_agent_work_manual(interval) is
  'Manual cleanup: deletes objectives/tasks older than caller-provided interval. Not scheduled.';

-- Convenience overload: accepts number of days.
create or replace function public.cleanup_old_agent_work_manual(p_days integer)
returns table (deleted_tasks bigint, deleted_objectives bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_days is null or p_days <= 0 then
    raise exception 'p_days must be a positive integer';
  end if;

  return query
  select *
  from public.cleanup_old_agent_work_manual(make_interval(days => p_days));
end;
$$;

comment on function public.cleanup_old_agent_work_manual(integer) is
  'Manual cleanup convenience overload: days -> interval.';

-- =====================================================================
-- D) Minimal optional schema hardening/performance support
-- =====================================================================
-- These indexes are safe no-ops if already present and help cleanup scans.
create index if not exists idx_agent_objectives_status_created_at
  on public.agent_objectives (status, created_at);

create index if not exists idx_agent_tasks_objective_id
  on public.agent_tasks (objective_id);
