DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE, CREATE ON SCHEMA public TO anon, authenticated, service_role, sandbox_exec;
GRANT CREATE ON SCHEMA public TO postgres;