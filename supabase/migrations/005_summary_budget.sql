-- Daily ceiling on AI summary generations (/api/summary), so a flood of
-- requests can't run up the Anthropic bill. One row per UTC day.

create table if not exists summary_usage (
    day date primary key,
    count integer not null default 0
);

-- Lock down public REST access; only the service-role key can read/write.
alter table summary_usage enable row level security;

-- Atomically takes one generation from today's allowance. Returns false once
-- `daily_limit` have been taken today; the conditional upsert means concurrent
-- callers can't both take the last one.
create or replace function claim_summary_slot(daily_limit integer)
returns boolean
language sql
as $$
    with claimed as (
        insert into summary_usage as u (day, count)
        values (current_date, 1)
        on conflict (day) do update
            set count = u.count + 1
            where u.count < daily_limit
        returning 1
    )
    select exists (select 1 from claimed);
$$;

revoke execute on function claim_summary_slot(integer) from public, anon, authenticated;
