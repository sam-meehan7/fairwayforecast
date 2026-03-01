-- Golf Weather MVP Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User profiles (stores Google OAuth tokens and preferences)
create table profiles (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    name text,
    google_access_token text,
    google_refresh_token text,
    default_club_id uuid,
    notifications_enabled boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Golf clubs with coordinates
create table clubs (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    latitude decimal,
    longitude decimal,
    created_at timestamptz default now()
);

-- Add foreign key for default_club_id after clubs table exists
alter table profiles
    add constraint fk_default_club
    foreign key (default_club_id) references clubs(id);

-- Detected golf events from calendar
create table golf_events (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references profiles(id) on delete cascade,
    club_id uuid references clubs(id),
    club_name_raw text, -- Store raw club name from event even if not matched
    event_date date not null,
    event_time time,
    calendar_event_id text, -- Google Calendar event ID to avoid duplicates
    evening_notified boolean default false,
    morning_notified boolean default false,
    created_at timestamptz default now()
);

-- Indexes for common queries
create index idx_golf_events_user on golf_events(user_id);
create index idx_golf_events_date on golf_events(event_date);
create index idx_golf_events_calendar_id on golf_events(user_id, calendar_event_id);
create index idx_profiles_email on profiles(email);

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger for profiles updated_at
create trigger profiles_updated_at
    before update on profiles
    for each row
    execute function update_updated_at();

-- Row Level Security (optional, can enable later)
-- alter table profiles enable row level security;
-- alter table golf_events enable row level security;
