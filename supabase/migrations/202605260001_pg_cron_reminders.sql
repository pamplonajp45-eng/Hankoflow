-- Supabase reminder automation.
-- Run this after the main request/approval/reminder tables exist.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.get_overdue_approval_logs()
returns table (
  approval_log_id integer,
  level integer,
  approver_email varchar,
  deadline timestamptz,
  request_id integer,
  file_path varchar,
  submitted_by varchar
)
language sql
security definer
set search_path = public
as $$
  select
    l.id as approval_log_id,
    l.level,
    l.approver_email,
    l.deadline,
    r.id as request_id,
    r.file_path,
    r.submitted_by
  from approval_logs l
  join requests r on r.id = l.request_id
  where l.action = 'pending'
    and r.status = 'pending'
    and l.deadline < now()
  order by l.deadline asc;
$$;

create or replace function public.record_approval_reminder(p_approval_log_id integer)
returns table (
  approval_log_id integer,
  new_deadline timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_deadline timestamptz;
begin
  insert into reminders (approval_log_id)
  values (p_approval_log_id);

  update approval_logs
  set deadline = deadline + interval '2 days'
  where id = p_approval_log_id
    and action = 'pending'
  returning deadline into v_new_deadline;

  if v_new_deadline is null then
    raise exception 'Approval log % is not pending or does not exist', p_approval_log_id;
  end if;

  return query select p_approval_log_id, v_new_deadline;
end;
$$;

-- Replace the token before running this block in the Supabase SQL editor.
-- The token should match APPROVAL_MAILER_TOKEN in the Edge Function secrets.
select cron.unschedule('approval-reminders-hourly')
where exists (
  select 1
  from cron.job
  where jobname = 'approval-reminders-hourly'
);

select cron.schedule(
  'approval-reminders-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://lcfadiceswkkokyvvgoc.functions.supabase.co/approval-mailer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_APPROVAL_MAILER_TOKEN'
    ),
    body := jsonb_build_object('eventType', 'reminder_batch')
  );
  $$
);
