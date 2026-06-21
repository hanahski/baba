import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const purchaseLibraryBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { bookId } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: book, error: bookErr } = await supabaseAdmin
      .from("library_books")
      .select("id,title,price_credits,read_url")
      .eq("id", bookId)
      .maybeSingle();
    if (bookErr) throw new Error(bookErr.message);
    if (!book) throw new Error("Book not found");

    const { data: isAdmin, error: adminErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: uid,
      _role: "admin",
    });
    if (adminErr) throw new Error(adminErr.message);

    const { data: existing } = await supabaseAdmin
      .from("library_book_purchases")
      .select("id")
      .eq("book_id", bookId)
      .eq("user_id", uid)
      .maybeSingle();
    if (existing) {
      return { ok: true, already_owned: true, read_url: book.read_url };
    }

    // Claim the composite purchase key first. Concurrent taps now produce one
    // winner instead of throwing a duplicate-key error (or charging twice).
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("library_book_purchases")
      .upsert(
        { book_id: bookId, user_id: uid, price_paid: isAdmin ? 0 : book.price_credits },
        { onConflict: "book_id,user_id", ignoreDuplicates: true },
      )
      .select("book_id");
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed?.length) {
      return { ok: true, already_owned: true, read_url: book.read_url };
    }

    if (book.price_credits > 0 && !isAdmin) {
      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("credits")
        .eq("id", uid)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!profile || profile.credits < book.price_credits) {
        await supabaseAdmin.from("library_book_purchases").delete().eq("book_id", bookId).eq("user_id", uid);
        throw new Error("INSUFFICIENT_CREDITS");
      }
      const newBalance = profile.credits - book.price_credits;
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({ credits: newBalance })
        .eq("id", uid);
      if (updErr) {
        await supabaseAdmin.from("library_book_purchases").delete().eq("book_id", bookId).eq("user_id", uid);
        throw new Error(updErr.message);
      }

      await supabaseAdmin.from("credit_transactions").insert({
        user_id: uid,
        amount: -book.price_credits,
        reason: "library_book_purchase",
        metadata: { book_id: bookId, title: book.title },
        balance_after: newBalance,
      });
    }

    return { ok: true, already_owned: false, read_url: book.read_url };
  });
