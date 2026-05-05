
REVOKE EXECUTE ON FUNCTION public.assert_owns(regclass, uuid, uuid)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_estimates_assert_owns()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_invoices_assert_owns()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_projects_assert_owns()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_project_child_assert_owns()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()               FROM PUBLIC, anon, authenticated;
-- has_role must remain callable by signed-in users so RLS can use it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)          TO authenticated;
