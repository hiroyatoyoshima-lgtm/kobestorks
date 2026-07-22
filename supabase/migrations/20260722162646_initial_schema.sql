-- STORKS Performance Hub — DBスキーマ(§4)+ マルチテナントRLS(§8)
-- Supabase の SQL Editor で実行するか、`supabase db push` で適用する。
-- 実行順: 1) このファイル 2) seed.sql(任意・開発用ダミーデータ)

create extension if not exists "pgcrypto";

-- =========================================================
-- §8 マルチテナント基盤
-- =========================================================
create table teams (
  team_id      uuid primary key default gen_random_uuid(),
  name         text not null,
  logo_url     text,
  color        text,
  plan         text not null default 'trial',
  created_at   timestamptz not null default now()
);

-- §3 ユーザーと権限。auth.users と1:1。RLS判定の起点。
create table users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  team_id      uuid not null references teams (team_id) on delete cascade,
  email        text not null,
  role         text not null check (role in ('admin', 'medical', 'nutrition', 'coach', 'player')),
  player_id    text, -- role='player' の場合、players.player_id に対応
  is_team_manager boolean not null default false, -- そのチームのユーザー管理ができるか(roleとは独立)
  created_at   timestamptz not null default now()
);
create unique index users_team_email_idx on users (team_id, email);

-- プラットフォーム管理者(クロスチーム。現状は開発者のみ)。§8のマルチテナント将来対応の起点。
create table platform_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);

-- =========================================================
-- §4.1 players 選手マスタ
-- =========================================================
create table players (
  team_id         uuid not null references teams (team_id) on delete cascade,
  player_id       text not null,
  name_ja         text not null,
  name_kinexon    text not null,
  number          int not null,
  position        text,
  position_group  text not null check (position_group in ('GUARD', 'WING', 'BIG')),
  height_cm       numeric,
  weight_kg       numeric,
  birthday        date,
  photo_url       text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (team_id, player_id)
);

-- =========================================================
-- §4.2 sessions Kinexon取込み結果(ドリル単位で1行)
-- =========================================================
create table sessions (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references teams (team_id) on delete cascade,
  session_id       text not null,
  date             date not null,
  start_time       time,
  end_time         time,
  session_type     text check (session_type in ('練習', '試合', '個別', 'リハビリ')),
  drill_name       text,
  player_id        text not null,
  aal              numeric,
  distance_m       numeric,
  distance_per_min numeric,
  accel_count      int,
  decel_count      int,
  jump_count       int,
  jump_height_max_m       numeric,
  speed_max_kmh           numeric,
  changes_of_orientation  numeric,
  exertions               numeric,
  anaerobic_distance_m    numeric,
  accel_load_high         numeric,
  accel_load_very_high    numeric,
  duration_min            numeric, -- Kinexonエクスポートの"Time"列(HH:MM:SS)から算出したセッション時間
  source           text not null default 'kinexon_csv',
  created_at       timestamptz not null default now(),
  foreign key (team_id, player_id) references players (team_id, player_id)
);
create index sessions_team_player_date_idx on sessions (team_id, player_id, date);

-- =========================================================
-- §4.3 daily_load 日次集計(アプリが自動計算して書き戻す)
-- =========================================================
create table daily_load (
  team_id         uuid not null references teams (team_id) on delete cascade,
  player_id       text not null,
  date            date not null,
  total_aal       numeric,
  target_aal      numeric,
  deficit_load    numeric,
  deficit_min     numeric,
  intensity_band  text,
  acwr            numeric,
  srpe            numeric,
  total_distance_m numeric,
  duration_min    numeric,
  updated_at      timestamptz not null default now(),
  primary key (team_id, player_id, date),
  foreign key (team_id, player_id) references players (team_id, player_id)
);

-- =========================================================
-- §4.4 wellness コンディションアンケート回答
-- =========================================================
create table wellness (
  team_id        uuid not null references teams (team_id) on delete cascade,
  player_id      text not null,
  date           date not null,
  sleep_hours    numeric,
  sleep_quality  int check (sleep_quality between 1 and 5),
  fatigue        int check (fatigue between 1 and 5),
  soreness       int check (soreness between 1 and 5),
  stress         int check (stress between 1 and 5),
  rpe            int check (rpe between 1 and 10), -- 練習後の主観的きつさ(sRPE = rpe × sessions.duration_min)
  pain_flag      boolean not null default false,
  pain_note      text,
  comment        text,
  source         text not null default 'app',
  submitted_at   timestamptz not null default now(),
  primary key (team_id, player_id, date),
  foreign key (team_id, player_id) references players (team_id, player_id)
);

-- =========================================================
-- §4.5 injuries 怪我(要配慮情報)
-- =========================================================
create table injuries (
  injury_id       uuid primary key default gen_random_uuid(),
  team_id         uuid not null references teams (team_id) on delete cascade,
  player_id       text not null,
  diagnosis       text not null,
  body_part       text,
  side            text,
  onset_date      date not null,
  mechanism       text check (mechanism in ('接触', '非接触')),
  status          text not null check (status in ('out', 'part', 'watch')),
  rtp_phase       text,
  rtp_target_date date,
  return_date     date,
  note            text,
  updated_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (team_id, player_id) references players (team_id, player_id)
);
create index injuries_team_player_idx on injuries (team_id, player_id);

-- =========================================================
-- §4.6 care_log ケア・治療記録
-- =========================================================
create table care_log (
  care_id     uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams (team_id) on delete cascade,
  date        date not null,
  time        time,
  player_id   text not null,
  menu        text,
  staff       text,
  done        boolean not null default false,
  note        text,
  created_at  timestamptz not null default now(),
  foreign key (team_id, player_id) references players (team_id, player_id)
);
create index care_log_team_date_idx on care_log (team_id, date);

-- =========================================================
-- §4.7 inbody 体組成
-- =========================================================
create table inbody (
  team_id         uuid not null references teams (team_id) on delete cascade,
  player_id       text not null,
  date            date not null,
  weight_kg       numeric not null,
  muscle_mass_kg  numeric not null,
  fat_mass_kg     numeric not null,
  fat_pct         numeric not null,
  source          text not null default 'sheets_sync',
  created_at      timestamptz not null default now(),
  primary key (team_id, player_id, date),
  foreign key (team_id, player_id) references players (team_id, player_id)
);

-- =========================================================
-- §4.8 nutrition 栄養レポート
-- =========================================================
create table nutrition (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams (team_id) on delete cascade,
  date         date not null,
  timing       text check (timing in ('練習前', '練習後', '試合前', '試合後')),
  menu         text,
  kcal         numeric,
  protein_g    numeric,
  fat_g        numeric,
  carb_g       numeric,
  player_note  text,
  staff        text,
  created_at   timestamptz not null default now()
);
create index nutrition_team_date_idx on nutrition (team_id, date);

-- =========================================================
-- §4.9 decisions 判断ログ(将来のAI提案の学習データ)
-- =========================================================
create table decisions (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams (team_id) on delete cascade,
  date          date not null,
  player_id     text not null,
  decision      text check (decision in ('通常', '強度減', '時間短縮', '個別', '完全休養', 'ケア', '医師確認')),
  reason        text,
  decided_by    text,
  outcome_note  text,
  created_at    timestamptz not null default now(),
  foreign key (team_id, player_id) references players (team_id, player_id)
);

-- =========================================================
-- daily_comments 日次S&Cコメント(§5.2: decisionsまたは専用列。ここでは専用テーブル)
-- =========================================================
create table daily_comments (
  team_id     uuid not null references teams (team_id) on delete cascade,
  date        date not null,
  comment     text,
  updated_by  text,
  updated_at  timestamptz not null default now(),
  primary key (team_id, date)
);

-- =========================================================
-- §4.10 その他
-- =========================================================
create table settings (
  team_id  uuid not null references teams (team_id) on delete cascade,
  key      text not null,
  value    jsonb not null,
  primary key (team_id, key)
);

create table schedule (
  team_id   uuid not null references teams (team_id) on delete cascade,
  date      date not null,
  day_type  text check (day_type in ('練習日', '試合日', 'OFF')),
  primary key (team_id, date)
);

create table sheet_mappings (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams (team_id) on delete cascade,
  sheet_tab   text not null,
  table_name  text not null,
  column_map  jsonb not null,
  enabled     boolean not null default true
);

create table sync_logs (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams (team_id) on delete cascade,
  ran_at      timestamptz not null default now(),
  sheet_tab   text,
  status      text check (status in ('ok', 'error')),
  error_count int not null default 0,
  detail      jsonb
);

-- =========================================================
-- RLS(§3, §8): 全テーブル team_id 一致 + ロール条件を強制
-- =========================================================
alter table teams enable row level security;
alter table users enable row level security;
alter table platform_admins enable row level security;
alter table players enable row level security;
alter table sessions enable row level security;
alter table daily_load enable row level security;
alter table wellness enable row level security;
alter table injuries enable row level security;
alter table care_log enable row level security;
alter table inbody enable row level security;
alter table nutrition enable row level security;
alter table decisions enable row level security;
alter table daily_comments enable row level security;
alter table settings enable row level security;
alter table schedule enable row level security;
alter table sheet_mappings enable row level security;
alter table sync_logs enable row level security;

-- ヘルパー: 現在ログイン中ユーザーの team_id / role / player_id
create or replace function auth_team_id() returns uuid
language sql stable
as $$
  select team_id from users where user_id = auth.uid();
$$;

create or replace function auth_role() returns text
language sql stable
as $$
  select role from users where user_id = auth.uid();
$$;

create or replace function auth_player_id() returns text
language sql stable
as $$
  select player_id from users where user_id = auth.uid();
$$;

-- users: 自分のレコードのみ閲覧可(ロール判定に使うため)
create policy users_select_self on users
  for select using (user_id = auth.uid());

-- platform_admins: 自分がプラットフォーム管理者かどうかの判定にのみ使う
create policy platform_admins_select on platform_admins
  for select using (user_id = auth.uid());

-- team_id一致を要求する共通条件。閲覧系(全ロール共通)
create policy players_select on players
  for select using (team_id = auth_team_id());
create policy players_write on players
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

create policy sessions_select on sessions
  for select using (team_id = auth_team_id());
create policy sessions_write on sessions
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

create policy daily_load_select on daily_load
  for select using (team_id = auth_team_id());
create policy daily_load_write on daily_load
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

-- wellness: player は自分のレコードのみ。他ロールはteam全体を閲覧可(§3)
create policy wellness_select on wellness
  for select using (
    team_id = auth_team_id()
    and (auth_role() != 'player' or player_id = auth_player_id())
  );
-- 書き込みはadmin(代理入力)か、選手本人のみ(§3・なりすまし防止)。閲覧は他ロールにも開く。
create policy wellness_insert on wellness
  for insert with check (
    team_id = auth_team_id()
    and (auth_role() = 'admin' or (auth_role() = 'player' and player_id = auth_player_id()))
  );
create policy wellness_update on wellness
  for update using (
    team_id = auth_team_id()
    and (auth_role() = 'admin' or (auth_role() = 'player' and player_id = auth_player_id()))
  );

-- injuries: 要配慮情報。player は自分のみ、coach/nutritionは閲覧のみ、admin/medicalは編集可(§3)
create policy injuries_select on injuries
  for select using (
    team_id = auth_team_id()
    and (auth_role() != 'player' or player_id = auth_player_id())
  );
create policy injuries_write on injuries
  for all using (
    team_id = auth_team_id() and auth_role() in ('admin', 'medical')
  );

create policy care_log_select on care_log
  for select using (
    team_id = auth_team_id()
    and (auth_role() != 'player' or player_id = auth_player_id())
  );
create policy care_log_write on care_log
  for all using (
    team_id = auth_team_id() and auth_role() in ('admin', 'medical')
  );

create policy inbody_select on inbody
  for select using (
    team_id = auth_team_id()
    and (auth_role() != 'player' or player_id = auth_player_id())
  );
create policy inbody_write on inbody
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

create policy nutrition_select on nutrition
  for select using (team_id = auth_team_id());
create policy nutrition_write on nutrition
  for all using (
    team_id = auth_team_id() and auth_role() in ('admin', 'nutrition')
  );

create policy decisions_select on decisions
  for select using (
    team_id = auth_team_id()
    and (auth_role() != 'player' or player_id = auth_player_id())
  );
create policy decisions_write on decisions
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

create policy daily_comments_select on daily_comments
  for select using (team_id = auth_team_id());
create policy daily_comments_write on daily_comments
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

create policy settings_select on settings
  for select using (team_id = auth_team_id());
create policy settings_write on settings
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

create policy schedule_select on schedule
  for select using (team_id = auth_team_id());
create policy schedule_write on schedule
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

create policy sheet_mappings_select on sheet_mappings
  for select using (team_id = auth_team_id() and auth_role() = 'admin');
create policy sheet_mappings_write on sheet_mappings
  for all using (team_id = auth_team_id() and auth_role() = 'admin');

create policy sync_logs_select on sync_logs
  for select using (team_id = auth_team_id() and auth_role() = 'admin');

create policy teams_select on teams
  for select using (team_id = auth_team_id());
