CREATE OR REPLACE FUNCTION public.claim_ad_reward(_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  earned_today int;
  new_bal int;
  daily_cap int := 200;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _amount NOT IN (10, 25, 50) THEN RAISE EXCEPTION 'invalid reward amount'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO earned_today
  FROM public.credit_transactions
  WHERE user_id = uid AND reason = 'ad_reward' AND created_at::date = current_date;

  IF earned_today + _amount > daily_cap THEN
    RAISE EXCEPTION 'DAILY_LIMIT_REACHED';
  END IF;

  UPDATE public.profiles SET credits = credits + _amount WHERE id = uid RETURNING credits INTO new_bal;
  IF new_bal IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after, metadata)
  VALUES (uid, _amount, 'ad_reward', new_bal, jsonb_build_object('source', 'reward_ad'));

  RETURN jsonb_build_object('ok', true, 'credits_added', _amount, 'balance', new_bal, 'earned_today', earned_today + _amount, 'daily_cap', daily_cap);
END $$;

REVOKE ALL ON FUNCTION public.claim_ad_reward(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_ad_reward(integer) TO authenticated;