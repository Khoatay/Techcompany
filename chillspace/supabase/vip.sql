-- ChillSpace — Không gian riêng "Immigration": chỉ chủ app và người được cấp mã mời mới vào được.
-- Chạy 1 lần trong Supabase → SQL Editor (chạy lại cũng không sao). Cần chạy setup.sql trước.

-- ============ BẢNG ============
create table if not exists public.vip_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  is_admin boolean not null default false,
  added_at timestamptz not null default now()
);
create table if not exists public.vip_codes (
  code text primary key,
  is_admin boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);
-- cấu hình riêng (vd. link Google Sheet lịch bay) — chỉ người có quyền đọc được
create table if not exists public.vip_config (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.vip_members enable row level security;
alter table public.vip_codes enable row level security;
alter table public.vip_config enable row level security;

-- ============ HÀM ============
create or replace function public.is_vip() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.vip_members where user_id = auth.uid());
$$;
create or replace function public.is_vip_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.vip_members where user_id = auth.uid() and is_admin);
$$;

-- trạng thái của tôi: có quyền chưa, có phải người quản lý không, hệ thống đã có chủ chưa
create or replace function public.vip_status() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'member', exists (select 1 from public.vip_members where user_id = auth.uid()),
    'admin', exists (select 1 from public.vip_members where user_id = auth.uid() and is_admin),
    'has_admin', exists (select 1 from public.vip_members where is_admin)
  );
$$;

-- chủ app nhận quyền quản lý — CHỈ được khi hệ thống chưa có ai quản lý (làm ngay sau khi chạy file này)
create or replace function public.vip_claim_owner(p_name text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  perform pg_advisory_xact_lock(hashtext('vip_claim_owner'));
  if exists (select 1 from public.vip_members where is_admin) then return false; end if;
  insert into public.vip_members (user_id, name, is_admin) values (auth.uid(), left(coalesce(p_name, ''), 40), true)
  on conflict (user_id) do update set is_admin = true;
  return true;
end $$;

-- người quản lý tạo mã mời (dùng 1 lần)
create or replace function public.vip_create_code(p_admin boolean, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare c text; abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if not public.is_vip_admin() then raise exception 'Chỉ người quản lý mới tạo được mã'; end if;
  loop
    c := '';
    for i in 1..8 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from public.vip_codes where code = c);
  end loop;
  insert into public.vip_codes (code, is_admin, note) values (c, coalesce(p_admin, false), left(coalesce(p_note, ''), 60));
  return c;
end $$;

-- nhập mã mời → được vào không gian riêng
create or replace function public.vip_redeem(p_code text, p_name text) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.vip_codes;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select * into r from public.vip_codes where code = upper(replace(trim(coalesce(p_code, '')), ' ', '')) and used_by is null for update;
  if not found then return false; end if;
  update public.vip_codes set used_by = auth.uid(), used_at = now() where code = r.code;
  insert into public.vip_members (user_id, name, is_admin) values (auth.uid(), left(coalesce(p_name, ''), 40), r.is_admin)
  on conflict (user_id) do update set is_admin = public.vip_members.is_admin or excluded.is_admin,
    name = case when excluded.name <> '' then excluded.name else public.vip_members.name end;
  return true;
end $$;

-- ============ QUYỀN ============
revoke all on public.vip_members, public.vip_codes, public.vip_config from anon, public;
grant select, delete on public.vip_members to authenticated;
grant select, delete on public.vip_codes to authenticated;
grant select, insert, update on public.vip_config to authenticated;
revoke execute on function public.is_vip(), public.is_vip_admin(), public.vip_status(), public.vip_claim_owner(text), public.vip_create_code(boolean, text), public.vip_redeem(text, text) from anon, public;
grant execute on function public.is_vip(), public.is_vip_admin(), public.vip_status(), public.vip_claim_owner(text), public.vip_create_code(boolean, text), public.vip_redeem(text, text) to authenticated;

drop policy if exists "vip members read" on public.vip_members;
create policy "vip members read" on public.vip_members for select to authenticated using (user_id = auth.uid() or public.is_vip_admin());
drop policy if exists "vip members revoke" on public.vip_members;
create policy "vip members revoke" on public.vip_members for delete to authenticated using (public.is_vip_admin() and user_id <> auth.uid());

drop policy if exists "vip codes read" on public.vip_codes;
create policy "vip codes read" on public.vip_codes for select to authenticated using (public.is_vip_admin());
drop policy if exists "vip codes delete" on public.vip_codes;
create policy "vip codes delete" on public.vip_codes for delete to authenticated using (public.is_vip_admin());

drop policy if exists "vip config read" on public.vip_config;
create policy "vip config read" on public.vip_config for select to authenticated using (public.is_vip());
drop policy if exists "vip config add" on public.vip_config;
create policy "vip config add" on public.vip_config for insert to authenticated with check (public.is_vip_admin());
drop policy if exists "vip config edit" on public.vip_config;
create policy "vip config edit" on public.vip_config for update to authenticated using (public.is_vip_admin()) with check (public.is_vip_admin());
