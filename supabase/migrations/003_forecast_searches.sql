-- Log every successful forecast fetch so we can see which courses people care about.

create table if not exists forecast_searches (
    id uuid primary key default uuid_generate_v4(),
    course_name text not null,
    latitude decimal not null,
    longitude decimal not null,
    forecast_date date not null,
    tee_time integer not null,
    created_at timestamptz default now()
);

create index if not exists forecast_searches_created_at_idx
    on forecast_searches (created_at desc);

create index if not exists forecast_searches_course_name_idx
    on forecast_searches (lower(course_name));

-- Lock down public REST access; only the service-role key can read/write.
alter table forecast_searches enable row level security;
