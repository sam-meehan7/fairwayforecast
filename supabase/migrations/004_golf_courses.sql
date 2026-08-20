-- Local golf course catalogue.
--
-- Replaces api.golfcourseapi.com as the runtime source for course search.
-- That API dropped location.latitude/location.longitude from its responses,
-- which broke the forecast outright (the tee-time lookup is keyed on
-- coordinates), and it rate limits at 50 requests/day.
--
-- The primary source is now OpenStreetMap via the Overpass API
-- (scripts/import-osm-courses.mjs), which returns Irish courses with
-- coordinates already attached — no geocoding required. OSM data is ODbL;
-- attribution is already present on the map (src/components/course-map.tsx).
--
-- golfcourseapi remains available as an optional enrichment source
-- (scripts/seed-courses.mjs), hence the source/source_ref columns.

create extension if not exists pg_trgm;

create table golf_courses (
    -- "<source>:<source_ref>", e.g. "osm:way/12345678" or "gca:15237".
    -- Text rather than bigint because OSM and golfcourseapi ids are separate
    -- namespaces that would otherwise collide.
    id text primary key,
    source text not null,          -- osm | gca
    source_ref text not null,

    club_name text not null,
    course_name text,
    address text,
    city text,
    state text,
    country text,

    latitude decimal,
    longitude decimal,

    -- ok        : has usable coordinates (always true for OSM rows)
    -- pending   : discovered without coordinates, awaiting geocode
    -- no_address: nothing to geocode
    -- failed    : geocoder returned nothing, or a point outside Ireland
    geocode_status text not null default 'pending',
    geocode_attempts int not null default 0,
    geocode_provider text,
    geocode_error text,
    geocoded_at timestamptz,

    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    unique (source, source_ref)
);

-- Autocomplete does `ilike '%query%'` on club_name; a trigram index keeps that
-- from degrading into a seq scan.
create index idx_golf_courses_club_name_trgm
    on golf_courses using gin (club_name gin_trgm_ops);

create index idx_golf_courses_city_trgm
    on golf_courses using gin (city gin_trgm_ops);

-- The search route only ever returns rows that have coordinates.
create index idx_golf_courses_playable
    on golf_courses (club_name)
    where latitude is not null and longitude is not null;

create index idx_golf_courses_geocode_status on golf_courses(geocode_status);

create trigger golf_courses_updated_at
    before update on golf_courses
    for each row
    execute function update_updated_at();


-- ---------------------------------------------------------------------------
-- The tables below only support the optional golfcourseapi enrichment path.
-- They are unused if you populate solely from OpenStreetMap.
-- ---------------------------------------------------------------------------

-- Discovery work list. One row per search term we intend to spend quota on.
-- Marking rows 'done' is what makes seed-courses.mjs resumable across days:
-- a term already searched is never searched again.
create table course_seed_queries (
    query text primary key,
    status text not null default 'pending',   -- pending | done | error
    results_count int,
    error text,
    ran_at timestamptz
);

create index idx_course_seed_queries_status on course_seed_queries(status);

-- Daily quota ledger, keyed by UTC date, so a crash, a re-run, or a second
-- machine can't blow through the 50/day allowance.
create table course_api_usage (
    usage_date date primary key,
    request_count int not null default 0
);
