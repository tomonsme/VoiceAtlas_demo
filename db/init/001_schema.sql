create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  status text not null default 'active',
  role text not null default 'member',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  deleted_at timestamptz
);

create table if not exists consent_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  version text not null,
  title text not null,
  body_hash text not null,
  effective_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (document_type, version)
);

create table if not exists user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  document_id uuid not null references consent_documents(id),
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  ip_hash text,
  user_agent_hash text
);

create index if not exists user_consents_user_id_idx on user_consents(user_id);

create table if not exists diseases (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  active boolean not null default true
);

create table if not exists user_conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  disease_id uuid not null references diseases(id),
  condition_status_text text,
  visibility text not null default 'members',
  updated_at timestamptz not null default now()
);

create index if not exists user_conditions_user_id_idx on user_conditions(user_id);
create index if not exists user_conditions_disease_id_idx on user_conditions(disease_id);

create table if not exists user_demographics (
  user_id uuid primary key references users(id) on delete cascade,
  age_range text,
  gender text,
  visibility text not null default 'private'
);

create table if not exists user_privacy_settings (
  user_id uuid primary key references users(id) on delete cascade,
  profile_visibility text not null default 'members',
  search_visibility text not null default 'members',
  dm_permission text not null default 'members',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists research_studies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists research_enrollments (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references research_studies(id),
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending',
  participant_code text unique,
  enrolled_at timestamptz not null default now(),
  verified_at timestamptz,
  withdrawn_at timestamptz,
  unique (study_id, user_id)
);

create index if not exists research_enrollments_user_id_idx on research_enrollments(user_id);

create table if not exists research_identity_profiles (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references research_enrollments(id) on delete cascade,
  legal_name text not null,
  postal_code text not null,
  prefecture text not null,
  city text not null,
  address_line1 text not null,
  address_line2 text,
  encrypted_at timestamptz not null default now()
);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  badge_id uuid not null references badges(id),
  source_type text,
  source_id uuid,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists user_badges_user_id_idx on user_badges(user_id);

create table if not exists social_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text not null,
  bio text,
  avatar_url text,
  searchable boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists user_follows (
  follower_id uuid not null references users(id) on delete cascade,
  following_id uuid not null references users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists user_blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete set null,
  disease_id uuid references diseases(id) on delete set null,
  name text not null,
  description text,
  privacy text not null default 'public',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists community_memberships (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  community_id uuid references communities(id) on delete cascade,
  body text not null,
  visibility text not null default 'members',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create index if not exists posts_author_id_idx on posts(author_id);
create index if not exists posts_community_id_idx on posts(community_id);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id, reaction_type)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform text not null,
  token_hash text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

