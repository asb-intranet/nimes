begin;
create table if not exists public.asb_push_devices(user_id uuid references auth.users(id) on delete cascade, endpoint text primary key, subscription jsonb not null, preferences text[] not null, updated_at timestamptz default now());
create table if not exists public.asb_push_events(id uuid primary key default gen_random_uuid(), kind text not null, employee_id uuid, task_group uuid, created_at timestamptz default now());
alter table public.asb_push_devices enable row level security;
alter table public.asb_push_events enable row level security;
revoke all on public.asb_push_devices,public.asb_push_events from public,anon,authenticated;
grant select,insert,update,delete on public.asb_push_devices,public.asb_push_events to service_role;
grant select on public.asb_access,public.employees,public.employee_planning to service_role;
create or replace function public.asb_push_enqueue() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='asb_message_recipients' then insert into public.asb_push_events(kind,employee_id) values('message',new.employee_id);
 elsif tg_table_name='asb_material_requests' then
 if tg_op='INSERT' then insert into public.asb_push_events(kind) values('material');
 elsif tg_op='DELETE' then insert into public.asb_push_events(kind) values('material'); return old;
 else if new.status is distinct from old.status then insert into public.asb_push_events(kind,employee_id) values('material_status',new.employee_id); end if;
 if (new.content,new.needed_on,new.project_id,new.urgent) is distinct from (old.content,old.needed_on,old.project_id,old.urgent) then insert into public.asb_push_events(kind) values('material'); end if; end if;
 elsif tg_table_name='employee_planning' then
 if tg_op='DELETE' then insert into public.asb_push_events(kind,employee_id) values('planning',old.employee_id); return old; end if;
 insert into public.asb_push_events(kind,employee_id) values('planning',new.employee_id);
 if tg_op='UPDATE' and old.employee_id is distinct from new.employee_id then insert into public.asb_push_events(kind,employee_id) values('planning',old.employee_id); end if;
 elsif tg_table_name='asb_tasks' then
 if tg_op='INSERT' then insert into public.asb_push_events(kind,employee_id,task_group) values('task',new.employee_id,new.task_group);
 elsif new.done_at is not null and old.done_at is null then insert into public.asb_push_events(kind) values('done'); end if;
 end if; return new;
end $$;
revoke all on function public.asb_push_enqueue() from public,anon,authenticated;
drop trigger if exists asb_push_message on public.asb_message_recipients;
create trigger asb_push_message after insert on public.asb_message_recipients for each row execute function public.asb_push_enqueue();
drop trigger if exists asb_push_material on public.asb_material_requests;
create trigger asb_push_material after insert or update or delete on public.asb_material_requests for each row execute function public.asb_push_enqueue();
drop trigger if exists asb_push_planning on public.employee_planning;
create trigger asb_push_planning after insert or update or delete on public.employee_planning for each row execute function public.asb_push_enqueue();
drop trigger if exists asb_push_task on public.asb_tasks;
create trigger asb_push_task after insert or update on public.asb_tasks for each row execute function public.asb_push_enqueue();
commit;
