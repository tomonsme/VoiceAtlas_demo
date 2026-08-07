insert into consent_documents (document_type, version, title, body_hash, effective_at)
values
  ('terms', '1.0.0', 'VoiceAtlas 利用規約・プライバシーポリシー', 'seed-terms-v1', now()),
  ('research_participation', '1.0.0', 'VoiceAtlas 研究参加同意', 'seed-research-consent-v1', now())
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

insert into research_studies (title, summary, status, starts_at)
values (
  'VoiceAtlas 初期研究',
  '疾患経験者のプロフィール、状態、研究参加意思を安全に扱うための初期研究。',
  'active',
  now()
)
on conflict do nothing;

insert into badges (code, label, description)
values (
  'research_verified',
  '研究認証',
  '研究参加同意と本人情報登録が完了したユーザーに表示するバッジ。'
)
on conflict (code) do nothing;

