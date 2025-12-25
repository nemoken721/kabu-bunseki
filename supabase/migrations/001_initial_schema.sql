-- =============================================
-- 10年長期分析＆AI予測レポート生成 データベーススキーマ
-- =============================================

-- 拡張機能の有効化
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. profiles テーブル（ユーザープロファイル）
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS有効化
alter table public.profiles enable row level security;

-- ポリシー: 自分のプロファイルのみ閲覧・編集可能
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 新規ユーザー登録時に自動でプロファイル作成
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- 2. companies テーブル（企業マスタ）
-- =============================================
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  code varchar(10) unique not null,           -- 証券コード（例: 7203）
  name text not null,                          -- 企業名
  name_en text,                                -- 企業名（英語）
  sector text,                                 -- 業種
  market text,                                 -- 市場（プライム、スタンダード等）
  edinet_code varchar(10),                     -- EDINETコード
  accounting_standard varchar(20),             -- 会計基準（日本基準/IFRS/米国基準）
  fiscal_year_end varchar(10),                 -- 決算月
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- インデックス
create index idx_companies_code on public.companies(code);
create index idx_companies_name on public.companies(name);

-- RLS有効化（企業情報は全ユーザー閲覧可能）
alter table public.companies enable row level security;

create policy "Companies are viewable by authenticated users" on public.companies
  for select using (auth.role() = 'authenticated');

-- =============================================
-- 3. financial_statements テーブル（財務データ）
-- =============================================
create table public.financial_statements (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  fiscal_year integer not null,                -- 会計年度
  fiscal_period varchar(10) not null,          -- 期間（FY, Q1, Q2, Q3, Q4）
  accounting_standard varchar(20),             -- 会計基準

  -- 損益計算書（PL）
  revenue bigint,                              -- 売上高
  operating_income bigint,                     -- 営業利益
  ordinary_income bigint,                      -- 経常利益
  net_income bigint,                           -- 当期純利益

  -- 貸借対照表（BS）
  total_assets bigint,                         -- 総資産
  total_liabilities bigint,                    -- 負債合計
  shareholders_equity bigint,                  -- 株主資本

  -- キャッシュフロー計算書（CF）
  operating_cf bigint,                         -- 営業CF
  investing_cf bigint,                         -- 投資CF
  financing_cf bigint,                         -- 財務CF

  -- 指標
  eps numeric(20, 2),                          -- 1株当たり利益
  bps numeric(20, 2),                          -- 1株当たり純資産
  roe numeric(10, 4),                          -- ROE
  roa numeric(10, 4),                          -- ROA

  -- MD&A要約
  mda_summary text,                            -- 経営者による分析要約

  -- メタデータ
  source_document_id text,                     -- EDINET書類ID
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(company_id, fiscal_year, fiscal_period)
);

-- インデックス
create index idx_financial_statements_company on public.financial_statements(company_id);
create index idx_financial_statements_year on public.financial_statements(fiscal_year);

-- RLS有効化
alter table public.financial_statements enable row level security;

create policy "Financial statements are viewable by authenticated users" on public.financial_statements
  for select using (auth.role() = 'authenticated');

-- =============================================
-- 4. stock_prices テーブル（株価データ）
-- =============================================
create table public.stock_prices (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  date date not null,
  open_price numeric(20, 2),                   -- 始値
  high_price numeric(20, 2),                   -- 高値
  low_price numeric(20, 2),                    -- 安値
  close_price numeric(20, 2) not null,         -- 終値
  adjusted_close numeric(20, 2),               -- 調整後終値
  volume bigint,                               -- 出来高
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(company_id, date)
);

-- インデックス
create index idx_stock_prices_company on public.stock_prices(company_id);
create index idx_stock_prices_date on public.stock_prices(date);
create index idx_stock_prices_company_date on public.stock_prices(company_id, date);

-- RLS有効化
alter table public.stock_prices enable row level security;

create policy "Stock prices are viewable by authenticated users" on public.stock_prices
  for select using (auth.role() = 'authenticated');

-- =============================================
-- 5. analysis_reports テーブル（AI生成レポート）
-- =============================================
create table public.analysis_reports (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,

  -- レポート内容
  report_type varchar(50) default 'full',      -- レポートタイプ
  past_analysis text,                          -- 過去分析
  features text,                               -- 特徴抽出
  prediction text,                             -- 未来予測
  reasoning text,                              -- 根拠
  disclaimer text,                             -- 免責事項

  -- メタデータ
  model_used varchar(50),                      -- 使用AIモデル
  prompt_tokens integer,                       -- プロンプトトークン数
  completion_tokens integer,                   -- 生成トークン数

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone           -- キャッシュ有効期限
);

-- インデックス
create index idx_analysis_reports_company on public.analysis_reports(company_id);
create index idx_analysis_reports_user on public.analysis_reports(user_id);
create index idx_analysis_reports_created on public.analysis_reports(created_at);

-- RLS有効化
alter table public.analysis_reports enable row level security;

-- ポリシー: 自分が作成したレポート、または公開レポートを閲覧可能
create policy "Users can view own reports" on public.analysis_reports
  for select using (auth.uid() = user_id);

create policy "Users can insert own reports" on public.analysis_reports
  for insert with check (auth.uid() = user_id);

-- =============================================
-- 6. user_watchlists テーブル（ウォッチリスト）
-- =============================================
create table public.user_watchlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  notes text,                                  -- メモ
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(user_id, company_id)
);

-- インデックス
create index idx_user_watchlists_user on public.user_watchlists(user_id);

-- RLS有効化
alter table public.user_watchlists enable row level security;

-- ポリシー: 自分のウォッチリストのみ操作可能
create policy "Users can view own watchlist" on public.user_watchlists
  for select using (auth.uid() = user_id);

create policy "Users can insert to own watchlist" on public.user_watchlists
  for insert with check (auth.uid() = user_id);

create policy "Users can delete from own watchlist" on public.user_watchlists
  for delete using (auth.uid() = user_id);

-- =============================================
-- updated_at 自動更新トリガー
-- =============================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_companies_updated_at
  before update on public.companies
  for each row execute procedure public.update_updated_at_column();

create trigger update_financial_statements_updated_at
  before update on public.financial_statements
  for each row execute procedure public.update_updated_at_column();
