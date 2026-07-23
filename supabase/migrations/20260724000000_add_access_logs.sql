-- 要配慮情報(怪我・ウェルネス・InBody・ケア記録)へのアクセス記録(§9)。
-- 「誰が・いつ・どの選手のデータを閲覧/編集したか」を残す監査ログ。
-- 書き込みはアプリのサーバー側(service_role)のみが行い、通常ユーザーからの
-- 改ざん・削除を防ぐため insert/update/delete 用の policy は意図的に作らない。
create table access_logs (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams (team_id) on delete cascade,
  actor_user_id uuid,
  actor_email   text,
  actor_role    text,
  action        text not null check (action in ('view', 'create', 'update')),
  resource      text not null,
  player_id     text,
  created_at    timestamptz not null default now()
);

alter table access_logs enable row level security;

create policy access_logs_select on access_logs
  for select using (team_id = auth_team_id() and auth_role() = 'admin');

create index access_logs_team_created_idx on access_logs (team_id, created_at desc);
