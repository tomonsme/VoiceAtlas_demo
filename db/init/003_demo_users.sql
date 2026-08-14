-- Demo personas for the walkthrough. Every persona sits in a different point of
-- the flow so the mock can show each state by logging in as a different account.
-- All statements are idempotent: safe to re-apply on every start-up.
--
--   tippy    研究参加済み（規約 1.0.0 → 1.1.0 の再同意履歴あり）
--   nagi     研究参加済み
--   mei      研究同意を撤回済み
--   hikari / ren / sora / kaede / yuki / tsumugi   ライト登録済み
--   newbie   サインアップのみ（規約未同意・未登録）

insert into users (id, nickname, email, created_at, last_seen_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'ティッピー', 'tippy@example.jp',   now() - interval '390 days', now() - interval '2 hours'),
  ('d0000000-0000-4000-8000-000000000002', 'ひかり',     'hikari@example.jp',  now() - interval '210 days', now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000003', 'めい',       'mei@example.jp',     now() - interval '180 days', now() - interval '9 days'),
  ('d0000000-0000-4000-8000-000000000004', 'れん',       'ren@example.jp',     now() - interval '150 days', now() - interval '3 days'),
  ('d0000000-0000-4000-8000-000000000005', 'そら',       'sora@example.jp',    now() - interval '120 days', now() - interval '5 days'),
  ('d0000000-0000-4000-8000-000000000006', 'かえで',     'kaede@example.jp',   now() - interval '95 days',  now() - interval '12 days'),
  ('d0000000-0000-4000-8000-000000000007', 'なぎ',       'nagi@example.jp',    now() - interval '80 days',  now() - interval '6 hours'),
  ('d0000000-0000-4000-8000-000000000008', 'ゆき',       'yuki@example.jp',    now() - interval '60 days',  now() - interval '2 days'),
  ('d0000000-0000-4000-8000-000000000009', 'つむぎ',     'tsumugi@example.jp', now() - interval '40 days',  now() - interval '8 days'),
  ('d0000000-0000-4000-8000-00000000000a', 'newbie',     'newbie@example.jp',  now() - interval '1 day',    now() - interval '1 day')
on conflict (id) do nothing;

-- Age and gender for everyone who completed light registration.
insert into user_demographics (user_id, age_range, gender, visibility)
values
  ('d0000000-0000-4000-8000-000000000001', '40代',     '男性',           'members'),
  ('d0000000-0000-4000-8000-000000000002', '30代',     '女性',           'members'),
  ('d0000000-0000-4000-8000-000000000003', '50代',     '女性',           'members'),
  ('d0000000-0000-4000-8000-000000000004', '60代',     '男性',           'members'),
  ('d0000000-0000-4000-8000-000000000005', '20代',     'ノンバイナリー', 'members'),
  ('d0000000-0000-4000-8000-000000000006', '10代',     '女性',           'members'),
  ('d0000000-0000-4000-8000-000000000007', '40代',     '女性',           'members'),
  ('d0000000-0000-4000-8000-000000000008', '30代',     '男性',           'members'),
  ('d0000000-0000-4000-8000-000000000009', '70代以上', '回答しない',     'members')
on conflict (user_id) do nothing;

insert into user_privacy_settings (user_id)
select id from users where email like '%@example.jp'
on conflict (user_id) do nothing;

-- Condition text. Skipped for anyone who already has one.
insert into user_conditions (user_id, disease_id, condition_status_text, visibility, updated_at)
select p.user_id, d.id, p.condition_text, 'members', p.updated_at
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, '筋痛性脳脊髄炎', '3年前、コロナワクチン接種後に強い倦怠感から日常生活が困難になりました。筋痛性脳脊髄炎と診断されるまで2年かかり、現在も症状は改善しません。', now() - interval '30 days'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'Long COVID', '感染から1年半、味覚と嗅覚の異常とブレインフォグが続いています。週3日の在宅勤務に切り替えて生活を組み立て直しました。', now() - interval '60 days'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, '線維筋痛症', '全身の痛みが10年以上続いています。複数の病院を回り、現在はペインクリニックで薬物療法と運動療法を併用しています。', now() - interval '20 days'),
    ('d0000000-0000-4000-8000-000000000004'::uuid, 'がん', '胃がんのステージIIで手術を受け、術後2年が経ちました。現在は経過観察中で、食事量の調整を続けています。', now() - interval '45 days'),
    ('d0000000-0000-4000-8000-000000000005'::uuid, '自己免疫疾患', '大学在学中に全身性エリテマトーデスと診断されました。ステロイドの量を調整しながら通学と治療を両立しています。', now() - interval '15 days'),
    ('d0000000-0000-4000-8000-000000000006'::uuid, '希少疾患', '生まれつきの希少疾患で、同じ疾患の人に出会ったことがありません。同世代とつながれる場所を探しています。', now() - interval '70 days'),
    ('d0000000-0000-4000-8000-000000000007'::uuid, 'Long COVID', '感染後から動悸と起立性の症状が続き、以前のように働けなくなりました。研究に参加することで原因の解明に役立てばと思っています。', now() - interval '10 days'),
    ('d0000000-0000-4000-8000-000000000008'::uuid, '筋痛性脳脊髄炎', '発症から5年です。体調の波が大きく、良い日と寝たきりの日の差が激しい状態が続いています。', now() - interval '25 days'),
    ('d0000000-0000-4000-8000-000000000009'::uuid, 'がん', '乳がんの治療を終えて5年になります。同じ経験をした方と情報交換ができればと考えています。', now() - interval '35 days')
) as p(user_id, disease_name, condition_text, updated_at)
join diseases d on d.name = p.disease_name
where not exists (select 1 from user_conditions uc where uc.user_id = p.user_id);

insert into social_profiles (user_id, display_name, bio)
select u.id, u.nickname, uc.condition_status_text
from users u
join user_conditions uc on uc.user_id = u.id
where u.email like '%@example.jp'
on conflict (user_id) do nothing;

-- Terms consent. tippy carries both versions so the consent history screen has
-- a re-consent to show; everyone else accepted the current version.
insert into user_consents (user_id, document_id, accepted_at)
select p.user_id, cd.id, p.accepted_at
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, '1.0.0', now() - interval '389 days'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, '1.1.0', now() - interval '29 days'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, '1.1.0', now() - interval '28 days'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, '1.1.0', now() - interval '27 days'),
    ('d0000000-0000-4000-8000-000000000004'::uuid, '1.1.0', now() - interval '26 days'),
    ('d0000000-0000-4000-8000-000000000005'::uuid, '1.1.0', now() - interval '25 days'),
    ('d0000000-0000-4000-8000-000000000006'::uuid, '1.1.0', now() - interval '24 days'),
    ('d0000000-0000-4000-8000-000000000007'::uuid, '1.1.0', now() - interval '23 days'),
    ('d0000000-0000-4000-8000-000000000008'::uuid, '1.1.0', now() - interval '22 days'),
    ('d0000000-0000-4000-8000-000000000009'::uuid, '1.1.0', now() - interval '21 days')
) as p(user_id, version, accepted_at)
join consent_documents cd on cd.document_type = 'terms' and cd.version = p.version
where not exists (
  select 1 from user_consents uc where uc.user_id = p.user_id and uc.document_id = cd.id
);

-- Research participation consent: two active, one withdrawn.
insert into user_consents (user_id, document_id, accepted_at, withdrawn_at)
select p.user_id, cd.id, p.accepted_at, p.withdrawn_at
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, now() - interval '150 days', null::timestamptz),
    ('d0000000-0000-4000-8000-000000000007'::uuid, now() - interval '70 days',  null::timestamptz),
    ('d0000000-0000-4000-8000-000000000003'::uuid, now() - interval '160 days', now() - interval '40 days')
) as p(user_id, accepted_at, withdrawn_at)
join consent_documents cd on cd.document_type = 'research_participation' and cd.version = '1.0.0'
where not exists (
  select 1 from user_consents uc where uc.user_id = p.user_id and uc.document_id = cd.id
);

insert into research_enrollments (study_id, user_id, status, participant_code, enrolled_at, verified_at, withdrawn_at)
select s.id, p.user_id, p.status, p.participant_code, p.enrolled_at, p.verified_at, p.withdrawn_at
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'verified',  'VA-DEMO0001', now() - interval '150 days', now() - interval '149 days', null::timestamptz),
    ('d0000000-0000-4000-8000-000000000007'::uuid, 'verified',  'VA-DEMO0007', now() - interval '70 days',  now() - interval '69 days',  null::timestamptz),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'withdrawn', 'VA-DEMO0003', now() - interval '160 days', now() - interval '159 days', now() - interval '40 days')
) as p(user_id, status, participant_code, enrolled_at, verified_at, withdrawn_at)
cross join (select id from research_studies where title = 'VoiceAtlas 初期研究') s
on conflict (study_id, user_id) do nothing;

insert into research_identity_profiles (enrollment_id, legal_name, postal_code, prefecture, city, address_line1, encrypted_at)
select re.id, p.legal_name, p.postal_code, p.prefecture, p.city, p.address_line1, now()
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, '山田 太郎', '5670000', '大阪府', '茨木市', '西駅前町1-1-1'),
    ('d0000000-0000-4000-8000-000000000007'::uuid, '佐藤 花子', '1000001', '東京都', '千代田区', '千代田1-1-2'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, '鈴木 一郎', '4600001', '愛知県', '名古屋市中区', '三の丸3-1-3')
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

-- Specimens for the three research personas, each at a different point of the
-- pipeline so the tracking page shows a different withdrawal phase per account.
--   tippy  解析まで完了（解析済みデータは撤回しても残る段階）
--   nagi   キット到着直後（まだ全面撤回できる段階・解析開始まで日数あり）
--   mei    撤回により破棄済み
insert into specimens (id, enrollment_id, specimen_code, specimen_type, status, analysis_scheduled_at, created_at)
select p.specimen_id, re.id, p.specimen_code, 'blood', p.status, p.analysis_scheduled_at, p.created_at
from (
  values
    ('e0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid, 'VA-SPC-DEMO0001', 'data_registered', now() - interval '140 days', now() - interval '148 days'),
    ('e0000000-0000-4000-8000-000000000007'::uuid, 'd0000000-0000-4000-8000-000000000007'::uuid, 'VA-SPC-DEMO0007', 'kit_delivered',   now() + interval '12 days',  now() - interval '68 days'),
    ('e0000000-0000-4000-8000-000000000003'::uuid, 'd0000000-0000-4000-8000-000000000003'::uuid, 'VA-SPC-DEMO0003', 'disposed',        now() - interval '145 days', now() - interval '158 days')
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

-- Four more 筋痛性脳脊髄炎 personas. The cohort average on マイページ is only
-- shown once five people with the same disease have recorded, so this is what
-- lets the demo show both sides of that rule.
insert into users (id, nickname, email, created_at, last_seen_at)
values
  ('d0000000-0000-4000-8000-00000000000b', 'あおい', 'aoi@example.jp',   now() - interval '150 days', now() - interval '1 day'),
  ('d0000000-0000-4000-8000-00000000000c', 'はると', 'haruto@example.jp', now() - interval '130 days', now() - interval '2 days'),
  ('d0000000-0000-4000-8000-00000000000d', 'みなと', 'minato@example.jp', now() - interval '110 days', now() - interval '4 days'),
  ('d0000000-0000-4000-8000-00000000000e', 'いつき', 'itsuki@example.jp', now() - interval '90 days',  now() - interval '6 days')
on conflict (id) do nothing;

insert into user_demographics (user_id, age_range, gender, visibility)
values
  ('d0000000-0000-4000-8000-00000000000b', '30代', '女性',       'members'),
  ('d0000000-0000-4000-8000-00000000000c', '20代', '男性',       'members'),
  ('d0000000-0000-4000-8000-00000000000d', '50代', '男性',       'members'),
  ('d0000000-0000-4000-8000-00000000000e', '40代', '回答しない', 'members')
on conflict (user_id) do nothing;

insert into user_conditions (user_id, disease_id, condition_status_text, visibility, updated_at)
select p.user_id, d.id, p.condition_text, 'members', now() - interval '30 days'
from (
  values
    ('d0000000-0000-4000-8000-00000000000b'::uuid, '発症から4年。午前中は起き上がれない日が多く、家事は分割して行っています。'),
    ('d0000000-0000-4000-8000-00000000000c'::uuid, '大学を休学中です。少し動くと数日寝込むため、活動量の管理を続けています。'),
    ('d0000000-0000-4000-8000-00000000000d'::uuid, '仕事を辞めて2年になります。体調の波が読めず、予定を入れるのが難しい状況です。'),
    ('d0000000-0000-4000-8000-00000000000e'::uuid, '感染後に発症しました。良い日と悪い日の差が大きく、記録をつけて把握しています。')
) as p(user_id, condition_text)
cross join (select id from diseases where name = '筋痛性脳脊髄炎') d
where not exists (select 1 from user_conditions uc where uc.user_id = p.user_id);

insert into user_privacy_settings (user_id)
select id from users where email like '%@example.jp'
on conflict (user_id) do nothing;

insert into social_profiles (user_id, display_name, bio)
select u.id, u.nickname, uc.condition_status_text
from users u
join user_conditions uc on uc.user_id = u.id
where u.email like '%@example.jp'
on conflict (user_id) do nothing;

insert into user_consents (user_id, document_id, accepted_at)
select u.id, cd.id, u.created_at + interval '1 hour'
from users u
cross join (select id from consent_documents where document_type = 'terms' and version = '1.1.0') cd
where u.email in ('aoi@example.jp', 'haruto@example.jp', 'minato@example.jp', 'itsuki@example.jp')
  and not exists (select 1 from user_consents uc where uc.user_id = u.id and uc.document_id = cd.id);

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
    ('d0000000-0000-4000-8000-000000000001'::uuid, 2.4, 0.2),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 3.0, 0.8),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 2.6, 0.0),
    ('d0000000-0000-4000-8000-000000000004'::uuid, 3.4, 0.4),
    ('d0000000-0000-4000-8000-000000000005'::uuid, 3.2, -0.3),
    ('d0000000-0000-4000-8000-000000000006'::uuid, 3.6, 0.2),
    ('d0000000-0000-4000-8000-000000000007'::uuid, 2.8, 0.9),
    ('d0000000-0000-4000-8000-000000000008'::uuid, 2.2, -0.4),
    ('d0000000-0000-4000-8000-000000000009'::uuid, 3.8, 0.1),
    ('d0000000-0000-4000-8000-00000000000b'::uuid, 2.5, 0.3),
    ('d0000000-0000-4000-8000-00000000000c'::uuid, 2.1, -0.2),
    ('d0000000-0000-4000-8000-00000000000d'::uuid, 2.7, 0.5),
    ('d0000000-0000-4000-8000-00000000000e'::uuid, 2.9, -0.5)
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
