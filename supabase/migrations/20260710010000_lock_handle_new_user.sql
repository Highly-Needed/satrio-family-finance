-- handle_new_user() is a trigger-only function; it referenced NEW.id and was
-- never meant to be called directly. The security advisor flagged it as
-- publicly executable via /rest/v1/rpc/handle_new_user for anon +
-- authenticated roles. Lock it down to trigger use only.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
