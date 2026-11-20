-- ChillSpace — cài đặt máy chủ Supabase cho tính năng "Phòng chung"
-- Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ file này → Run.
-- Chạy lại nhiều lần cũng không sao (an toàn khi chạy lặp).

-- ============ BẢNG ============
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Bạn mới' check (char_length(name) between 1 and 40),
  avatar_emoji text not null default '🙂' check (char_length(avatar_emoji) <= 16),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  name text not null check (char_length(name) between 1 and 60),
  space text not null default 'study' check (space ~ '^[a-z]{2,20}$'),
  owner uuid not null references auth.users on delete cascade,
  pomo jsonb not null default '{"mode":"focus","running":false,"focus":25,"brk":5,"remain":1500000,"endAt":0}',
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room text not null references public.rooms(code) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room, user_id)
);
create index if not exists room_members_user_idx on public.room_members (user_id);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  room text not null references public.rooms(code) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null default 'chat' check (kind in ('chat', 'sticker', 'done')),
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists messages_room_idx on public.messages (room, created_at desc);

create table if not exists public.focus_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  room text references public.rooms(code) on delete set null,
  minutes int not null check (minutes between 1 and 240),
  created_at timestamptz not null default now()
);
create index if not exists focus_log_user_idx on public.focus_log (user_id, created_at desc);

-- ============ HÀM HỖ TRỢ ============
create or replace function public.is_member(p_room text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from room_members where room = p_room and user_id = auth.uid());
$$;

create or replace function public.create_room(p_name text, p_space text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r rooms; c text; tries int := 0;
begin
  if auth.uid() is null then raise exception 'Bạn chưa đăng nhập'; end if;
  if (select count(*) from rooms where owner = auth.uid()) >= 20 then raise exception 'Bạn đã tạo tối đa 20 phòng'; end if;
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') into c
      from generate_series(1, 6);
    begin
      insert into rooms (code, name, space, owner) values (c, left(trim(p_name), 60), p_space, auth.uid()) returning * into r;
      exit;
    exception when unique_violation then
      tries := tries + 1; if tries > 5 then raise; end if;
    end;
  end loop;
  insert into room_members (room, user_id) values (c, auth.uid()) on conflict do nothing;
  return r;
end $$;

create or replace function public.join_room(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r rooms;
begin
  if auth.uid() is null then raise exception 'Bạn chưa đăng nhập'; end if;
  select * into r from rooms where code = upper(trim(p_code));
  if not found then raise exception 'Không tìm thấy phòng %', upper(trim(p_code)); end if;
  if (select count(*) from room_members where room = r.code) >= 50 and not is_member(r.code) then raise exception 'Phòng đã đầy (50 người)'; end if;
  insert into room_members (room, user_id) values (r.code, auth.uid()) on conflict do nothing;
  return r;
end $$;

create or replace function public.set_room_pomo(p_code text, p_pomo jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_member(p_code) then raise exception 'Bạn không ở trong phòng này'; end if;
  update rooms set pomo = p_pomo where code = p_code;
end $$;

create or replace function public.set_room_space(p_code text, p_space text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update rooms set space = p_space where code = p_code and owner = auth.uid();
end $$;

create or replace function public.leaderboard(p_code text)
returns table (user_id uuid, name text, avatar_emoji text, avatar_url text, minutes bigint)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.name, 'Bạn mới'), coalesce(p.avatar_emoji, '🙂'), p.avatar_url,
         coalesce(sum(f.minutes), 0)::bigint
  from room_members m
  left join profiles p on p.id = m.user_id
  left join focus_log f on f.user_id = m.user_id and f.created_at >= date_trunc('week', now())
  where m.room = p_code and is_member(p_code)
  group by m.user_id, p.name, p.avatar_emoji, p.avatar_url
  order by 5 desc
  limit 50;
$$;

revoke execute on function public.create_room(text, text), public.join_room(text), public.set_room_pomo(text, jsonb),
  public.set_room_space(text, text), public.leaderboard(text) from public, anon;
grant execute on function public.create_room(text, text), public.join_room(text), public.set_room_pomo(text, jsonb),
  public.set_room_space(text, text), public.leaderboard(text), public.is_member(text) to authenticated;

-- ============ QUYỀN TRUY CẬP QUA API ============
-- (Ghi rõ để không phụ thuộc tuỳ chọn "Grant API access to new tables automatically" khi tạo dự án)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.rooms, public.room_members, public.messages, public.focus_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ============ BẢO MẬT (RLS) ============
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.focus_log enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "rooms read members" on public.rooms;
create policy "rooms read members" on public.rooms for select to authenticated using (public.is_member(code));
drop policy if exists "rooms delete owner" on public.rooms;
create policy "rooms delete owner" on public.rooms for delete to authenticated using (owner = auth.uid());

drop policy if exists "members read" on public.room_members;
create policy "members read" on public.room_members for select to authenticated using (public.is_member(room));
drop policy if exists "members leave" on public.room_members;
create policy "members leave" on public.room_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "messages read" on public.messages;
create policy "messages read" on public.messages for select to authenticated using (public.is_member(room));
drop policy if exists "messages send" on public.messages;
create policy "messages send" on public.messages for insert to authenticated with check (user_id = auth.uid() and public.is_member(room));
drop policy if exists "messages delete own" on public.messages;
create policy "messages delete own" on public.messages for delete to authenticated using (user_id = auth.uid());

drop policy if exists "focus insert own" on public.focus_log;
create policy "focus insert own" on public.focus_log for insert to authenticated with check (user_id = auth.uid() and (room is null or public.is_member(room)));
drop policy if exists "focus read own" on public.focus_log;
create policy "focus read own" on public.focus_log for select to authenticated using (user_id = auth.uid());

-- ============ THỜI GIAN THỰC ============
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null; end $$;

-- ============ ẢNH ĐẠI DIỆN ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
