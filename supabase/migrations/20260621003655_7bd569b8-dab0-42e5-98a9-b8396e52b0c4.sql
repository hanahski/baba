CREATE OR REPLACE FUNCTION public.exec_sql(q text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  EXECUTE q;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'err', SQLERRM);
END $$;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;