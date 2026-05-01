-- Feature interest waitlist (coming-soon modal submissions)

create table if not exists feature_interest (
    id uuid primary key default uuid_generate_v4(),
    email text not null,
    created_at timestamptz default now()
);

create unique index if not exists feature_interest_email_key
    on feature_interest (lower(email));

-- Lock down public REST access; only the service-role key (used by /api/interest) can read/write.
alter table feature_interest enable row level security;
