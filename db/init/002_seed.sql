-- Reference data. Every statement is idempotent so the app can re-apply it on
-- start-up against an existing volume.

insert into consent_documents (document_type, version, title, body_hash, effective_at)
values
  ('terms', '1.0.0', 'VoiceAtlas 利用規約・プライバシーポリシー', 'seed-terms-v1', now() - interval '400 days'),
  ('terms', '1.1.0', 'VoiceAtlas 利用規約・プライバシーポリシー', 'seed-terms-v2', now() - interval '30 days'),
  ('research_participation', '1.0.0', 'VoiceAtlas 研究参加同意', 'seed-research-consent-v1', now() - interval '200 days')
on conflict (document_type, version) do nothing;

insert into diseases (name, category)
values
  ('筋痛性脳脊髄炎', 'neurology'),
  ('Long COVID', 'post_infectious'),
  ('線維筋痛症', 'pain'),
  ('がん', 'oncology'),
  ('自己免疫疾患', 'immune'),
  ('希少疾患', 'rare_disease'),
  ('その他', 'other')
on conflict (name) do nothing;

-- status: recruiting = 募集中 / active = 実施中 / closed = 終了
insert into research_studies (title, summary, status, institution, target_summary, starts_at)
select v.title, v.summary, v.status, v.institution, v.target_summary, v.starts_at
from (
  values
    ('VoiceAtlas 初期研究',
     '疾患経験者のプロフィール、状態、研究参加意思を安全に扱うための初期研究。血液検体と日々の記録から、症状の重さに関わる要因を調べます。',
     'active',
     '国内の大学医学部（研究代表機関）',
     '筋痛性脳脊髄炎、Long COVID、線維筋痛症',
     now() - interval '200 days'),
    ('筋痛性脳脊髄炎の重症度指標に関する研究',
     '日々の体調記録と血液検体から、重症度を判定できる指標を探します。通院の負担を減らすことを目指しています。',
     'recruiting',
     '国内の大学病院 神経内科',
     '筋痛性脳脊髄炎と診断されている方',
     now() - interval '30 days'),
    ('Long COVIDの回復経過に関する長期観察',
     '感染後の症状がどのように変化するかを2年間かけて観察します。検体の提供は年1回です。',
     'recruiting',
     '国内の研究機関',
     'Long COVIDの症状が3か月以上続いている方',
     now() - interval '10 days'),
    ('慢性疲労と睡眠の関連調査',
     '睡眠の質と日中の疲労感の関連を調べた調査です。募集は終了しました。',
     'closed',
     '国内の大学 睡眠医科学講座',
     '慢性的な疲労のある方',
     now() - interval '400 days')
) as v(title, summary, status, institution, target_summary, starts_at)
where not exists (select 1 from research_studies rs where rs.title = v.title);

update research_studies
   set institution = coalesce(institution, '国内の大学医学部（研究代表機関）'),
       target_summary = coalesce(target_summary, '疾患経験のある方')
 where institution is null or target_summary is null;

update research_studies
   set data_lock_at = coalesce(data_lock_at, now() + interval '180 days'),
       withdrawal_policy_note = coalesce(
         withdrawal_policy_note,
         '解析が始まる前に撤回した場合は、検体を破棄し、提供いただいた情報をすべて削除します。解析が始まった後は、検体の破棄と以後の利用停止はできますが、既に解析を終えたデータの削除はできない場合があります。データ固定日を過ぎると、統計処理に含まれたデータは取り出せません。'
       )
 where title = 'VoiceAtlas 初期研究';

insert into study_data_uses (study_id, sort_order, purpose, detail, data_items, recipient, retention, withdrawable, applies_from)
select s.id, v.sort_order, v.purpose, v.detail, v.data_items, v.recipient, v.retention, v.withdrawable, v.applies_from
from (select id from research_studies where title = 'VoiceAtlas 初期研究') s
cross join (
  values
    (1,
     '疾患メカニズムの解明',
     '発症の仕組みや、症状の重さに関わる要因を調べます。',
     '血液検体（DNA・血漿）、症状・治療の記録、年代・性別',
     '研究代表機関（国内の大学医学部）',
     '研究終了後5年',
     true,
     'analyzing'),
    (2,
     '診断マーカーの探索',
     '血液中の指標から、診断や重症度の判定に使える指標を探します。',
     '血液検体（血漿）、症状の経過記録',
     '研究代表機関および共同研究機関（国内）',
     '研究終了後5年',
     true,
     'analyzing'),
    (3,
     '検体・結果の送付',
     '採取キットの発送と、希望者への結果返却に使います。解析には使用しません。',
     '氏名、住所',
     'VoiceAtlas運営（発送業務のみ）',
     '送付完了後1年',
     true,
     'kit_shipped'),
    (4,
     '研究成果の公表',
     '論文・学会発表に使用します。個人が特定できない統計処理後の形のみを扱います。',
     '統計処理後のデータ（個人を特定できない形）',
     '学術論文、学会発表',
     '公表後は削除できません',
     false,
     'data_registered')
) as v(sort_order, purpose, detail, data_items, recipient, retention, withdrawable, applies_from)
on conflict (study_id, purpose) do update set applies_from = excluded.applies_from;

insert into study_data_uses (study_id, sort_order, purpose, detail, data_items, recipient, retention, withdrawable, applies_from)
select rs.id, v.sort_order, v.purpose, v.detail, v.data_items, v.recipient, v.retention, v.withdrawable, v.applies_from
from research_studies rs
cross join (
  values
    (1, '研究目的での解析', '研究計画に記載された解析にのみ使用します。',
     '血液検体、症状・治療の記録、年代・性別', '研究代表機関', '研究終了後5年', true, 'analyzing'),
    (2, '検体・結果の送付', '採取キットの発送と、希望者への結果返却に使います。解析には使用しません。',
     '氏名、住所', 'VoiceAtlas運営（発送業務のみ）', '送付完了後1年', true, 'kit_shipped'),
    (3, '研究成果の公表', '論文・学会発表に使用します。個人が特定できない統計処理後の形のみを扱います。',
     '統計処理後のデータ（個人を特定できない形）', '学術論文、学会発表', '公表後は削除できません', false, 'data_registered')
) as v(sort_order, purpose, detail, data_items, recipient, retention, withdrawable, applies_from)
where rs.title <> 'VoiceAtlas 初期研究'
on conflict (study_id, purpose) do nothing;

update research_studies
   set data_lock_at = coalesce(data_lock_at, now() + interval '180 days'),
       withdrawal_policy_note = coalesce(
         withdrawal_policy_note,
         '解析が始まる前に撤回した場合は、検体を破棄し、提供いただいた情報をすべて削除します。解析が始まった後は、検体の破棄と以後の利用停止はできますが、既に解析を終えたデータの削除はできない場合があります。'
       );

insert into badges (code, label, description)
values (
  'research_verified',
  '研究認証',
  '研究参加同意と本人情報登録が完了したユーザーに表示するバッジ。'
)
on conflict (code) do nothing;
