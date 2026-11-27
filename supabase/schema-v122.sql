begin;
alter table public.asb_messages add column if not exists updated_at timestamptz;
create or replace function public.asb_manage_message(mid uuid,subject_text text,body_text text,importance text,remove boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.asb_role() is distinct from 'admin' then raise exception 'Accès interdit'; end if;
 if remove then
  delete from public.asb_messages where id=mid;
  if not found then raise exception 'Message introuvable'; end if;
 else
  update public.asb_messages set subject=trim(subject_text),body=trim(body_text),priority=importance,updated_at=now() where id=mid;
  if not found then raise exception 'Message introuvable'; end if;
  update public.asb_message_recipients set read_at=null where message_id=mid;
 end if;
end $$;
revoke all on function public.asb_manage_message(uuid,text,text,text,boolean) from public,anon;
grant execute on function public.asb_manage_message(uuid,text,text,text,boolean) to authenticated;
commit;
