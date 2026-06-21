DROP FUNCTION IF EXISTS public.exec_sql(text);
CREATE OR REPLACE FUNCTION public.exec_sql(q text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  stmt text;
  errs jsonb := '[]'::jsonb;
  ok int := 0;
  fail int := 0;
BEGIN
  FOR stmt IN
    SELECT s FROM regexp_split_to_table(q, E';\\s*\\n') AS s
  LOOP
    IF length(trim(stmt)) = 0 THEN CONTINUE; END IF;
    BEGIN
      EXECUTE stmt;
      ok := ok + 1;
    EXCEPTION WHEN OTHERS THEN
      fail := fail + 1;
      errs := errs || jsonb_build_object('err', SQLERRM, 'stmt', left(stmt, 200));
    END;
  END LOOP;
  RETURN jsonb_build_object('ok', ok, 'fail', fail, 'errors', errs);
END $$;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO postgres;
CREATE OR REPLACE FUNCTION public.exec_sql(q text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  stmt text;
  errs jsonb := '[]'::jsonb;
  ok int := 0;
  fail int := 0;
BEGIN
  FOR stmt IN
    SELECT s FROM regexp_split_to_table(q, E';\\s*\\n') AS s
  LOOP
    IF length(trim(stmt)) = 0 THEN CONTINUE; END IF;
    BEGIN
      EXECUTE stmt;
      ok := ok + 1;
    EXCEPTION WHEN OTHERS THEN
      fail := fail + 1;
      errs := errs || jsonb_build_object('err', SQLERRM, 'stmt', left(stmt, 200));
    END;
  END LOOP;
  RETURN jsonb_build_object('ok', ok, 'fail', fail, 'errors', errs);
END $$;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
CREATE EXTENSION IF NOT EXISTS pgcrypto;