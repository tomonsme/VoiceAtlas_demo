-- Demo persona for the walkthrough. All statements are idempotent: safe to
-- re-apply on every start-up.
--
--   tippy  ライト登録・研究参加ずみ。規約は 1.0.0 → 1.1.0 の再同意履歴あり、
--          検体は解析からデータベース登録まで完了している状態。

insert into users (id, nickname, email, created_at, last_seen_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'ティッピー', 'tippy@example.jp',   now() - interval '390 days', now() - interval '2 hours')
on conflict (id) do nothing;

-- Age and gender for everyone who completed light registration.
insert into user_demographics (user_id, age_range, gender, visibility)
values
  ('d0000000-0000-4000-8000-000000000001', '40代',     '男性',           'members')
on conflict (user_id) do nothing;

insert into user_privacy_settings (user_id)
select id from users where email like '%@example.jp'
on conflict (user_id) do nothing;

-- Condition text. Skipped for anyone who already has one.
insert into user_conditions (user_id, disease_id, condition_status_text, visibility, updated_at)
select p.user_id, d.id, p.condition_text, 'members', p.updated_at
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, '筋痛性脳脊髄炎', '3年前、コロナワクチン接種後に強い倦怠感から日常生活が困難になりました。筋痛性脳脊髄炎と診断されるまで2年かかり、現在も症状は改善しません。', now() - interval '30 days')
) as p(user_id, disease_name, condition_text, updated_at)
join diseases d on d.name = p.disease_name
where not exists (select 1 from user_conditions uc where uc.user_id = p.user_id);

insert into social_profiles (user_id, display_name, bio)
select u.id, u.nickname, uc.condition_status_text
from users u
join user_conditions uc on uc.user_id = u.id
where u.email like '%@example.jp'
on conflict (user_id) do nothing;

-- 規約は両方の版に同意ずみ。同意履歴の画面に再同意の記録が出る。
insert into user_consents (user_id, document_id, accepted_at)
select p.user_id, cd.id, p.accepted_at
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, '1.0.0', now() - interval '389 days'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, '1.1.0', now() - interval '29 days')
) as p(user_id, version, accepted_at)
join consent_documents cd on cd.document_type = 'terms' and cd.version = p.version
where not exists (
  select 1 from user_consents uc where uc.user_id = p.user_id and uc.document_id = cd.id
);

-- 研究参加への同意。
insert into user_consents (user_id, document_id, accepted_at, withdrawn_at)
select p.user_id, cd.id, p.accepted_at, p.withdrawn_at
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, now() - interval '150 days', null::timestamptz)
) as p(user_id, accepted_at, withdrawn_at)
join consent_documents cd on cd.document_type = 'research_participation' and cd.version = '1.0.0'
where not exists (
  select 1 from user_consents uc where uc.user_id = p.user_id and uc.document_id = cd.id
);

insert into research_enrollments (study_id, user_id, status, participant_code, enrolled_at, verified_at, withdrawn_at)
select s.id, p.user_id, p.status, p.participant_code, p.enrolled_at, p.verified_at, p.withdrawn_at
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'verified',  'VA-DEMO0001', now() - interval '150 days', now() - interval '149 days', null::timestamptz)
) as p(user_id, status, participant_code, enrolled_at, verified_at, withdrawn_at)
cross join (select id from research_studies where title = 'VoiceAtlas 初期研究') s
on conflict (study_id, user_id) do nothing;

insert into research_identity_profiles (enrollment_id, legal_name, postal_code, prefecture, city, address_line1, encrypted_at)
select re.id, p.legal_name, p.postal_code, p.prefecture, p.city, p.address_line1, now()
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, '山田 太郎', '5670000', '大阪府', '茨木市', '西駅前町1-1-1')
) as p(user_id, legal_name, postal_code, prefecture, city, address_line1)
join research_enrollments re on re.user_id = p.user_id
on conflict (enrollment_id) do nothing;

insert into user_badges (user_id, badge_id, source_type, source_id, granted_at, revoked_at)
select re.user_id, b.id, 'research_enrollment', re.id, re.verified_at,
       case when re.status = 'withdrawn' then re.withdrawn_at end
from research_enrollments re
cross join (select id from badges where code = 'research_verified') b
where re.participant_code like 'VA-DEMO%'
  and not exists (
    select 1 from user_badges ub
     where ub.user_id = re.user_id and ub.badge_id = b.id and ub.source_id = re.id
  );

-- 検体は解析・データベース登録まで完了。撤回しても解析済みデータは残る段階。
insert into specimens (id, enrollment_id, specimen_code, specimen_type, status, analysis_scheduled_at, created_at)
select p.specimen_id, re.id, p.specimen_code, 'blood', p.status, p.analysis_scheduled_at, p.created_at
from (
  values
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid, 'VA-SPC-DEMO0001', 'data_registered', now() - interval '140 days', now() - interval '148 days')
) as p(specimen_id, user_id, specimen_code, status, analysis_scheduled_at, created_at)
join research_enrollments re on re.user_id = p.user_id
on conflict (id) do nothing;

insert into specimen_events (specimen_id, status, occurred_at, location, note)
select p.specimen_id, p.status, p.occurred_at, p.location, p.note
from (
  values
    -- tippy: full pipeline
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'kit_shipped',        now() - interval '148 days', '配送センター',   '登録住所へ採取キットを発送しました'),
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'kit_delivered',      now() - interval '146 days', 'お届け先',       'キットが届きました'),
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'specimen_returned',  now() - interval '143 days', '集荷',           '同梱の伝票で返送されました'),
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'lab_received',       now() - interval '142 days', '検査機関',       '検査機関が受領しました'),
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'accepted',           now() - interval '141 days', '検査機関',       '検品を完了し、受付が確定しました'),
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'analyzing',          now() - interval '140 days', '検査機関',       '解析を開始しました。この時点以降、全面撤回はできません'),
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'analysis_completed', now() - interval '120 days', '検査機関',       '解析が完了しました'),
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'data_registered',    now() - interval '118 days', '研究代表機関',   '研究データベースに登録されました'),
    -- nagi: kit delivered, analysis not started
    ('e0000000-0000-4000-8000-000000000007'::uuid, 'kit_shipped',        now() - interval '68 days',  '配送センター',   '登録住所へ採取キットを発送しました'),
    ('e0000000-0000-4000-8000-000000000007'::uuid, 'kit_delivered',      now() - interval '66 days',  'お届け先',       'キットが届きました'),
    -- mei: withdrew before analysis, specimen destroyed
    ('e0000000-0000-4000-8000-000000000003'::uuid, 'kit_shipped',        now() - interval '158 days', '配送センター',   '登録住所へ採取キットを発送しました'),
    ('e0000000-0000-4000-8000-000000000003'::uuid, 'kit_delivered',      now() - interval '156 days', 'お届け先',       'キットが届きました'),
    ('e0000000-0000-4000-8000-000000000003'::uuid, 'specimen_returned',  now() - interval '153 days', '集荷',           '同梱の伝票で返送されました'),
    ('e0000000-0000-4000-8000-000000000003'::uuid, 'lab_received',       now() - interval '152 days', '検査機関',       '検査機関が受領しました'),
    ('e0000000-0000-4000-8000-000000000003'::uuid, 'accepted',           now() - interval '151 days', '検査機関',       '検品を完了し、受付が確定しました'),
    ('e0000000-0000-4000-8000-000000000003'::uuid, 'disposed',           now() - interval '40 days',  '検査機関',       '同意撤回のため、解析前に検体を破棄しました')
) as p(specimen_id, status, occurred_at, location, note)
where exists (select 1 from specimens s where s.id = p.specimen_id)
  and not exists (
    select 1 from specimen_events e
     where e.specimen_id = p.specimen_id and e.status = p.status
  );


-- 200 days of daily records, ending yesterday so "今日の記録" is still open when
-- the demo starts. Values are derived from a hash of (user, day) so the series
-- is varied but identical on every rebuild.
insert into daily_checkins (user_id, recorded_on, condition_level, fatigue_level, sleep_level, post_exertional_malaise, created_at)
select
  p.user_id,
  day.d,
  level.condition_level,
  -- Fatigue and sleep move with the day's condition rather than independently,
  -- so a record never reads as "とても良い" alongside "疲労がとても強い".
  greatest(1, least(5, level.condition_level + (noise.n / 8 % 3) - 1)),
  greatest(1, least(5, level.condition_level + (noise.n / 32 % 3) - 1)),
  (noise.n % 7) = 0,
  day.d + time '21:00'
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 2.4, 0.2)
) as p(user_id, base, trend)
cross join lateral (
  select generate_series(current_date - 200, current_date - 1, interval '1 day')::date as d
) as day
cross join lateral (
  select get_byte(decode(md5(p.user_id::text || day.d::text), 'hex'), 0) as n
) as noise
cross join lateral (
  select greatest(1, least(5,
    (p.base + p.trend * (day.d - (current_date - 200)) / 200.0 + (noise.n % 5) - 2)::int
  )) as condition_level
) as level
-- Roughly one day in six is left blank, so the adherence figure is not a flat 100%.
where noise.n % 6 <> 0
  and exists (select 1 from user_conditions uc where uc.user_id = p.user_id)
on conflict (user_id, recorded_on) do nothing;
