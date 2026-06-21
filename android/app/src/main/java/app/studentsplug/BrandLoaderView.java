package app.studentsplug;

import android.animation.ValueAnimator;
import android.content.Context;
import android.content.res.Resources;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Shader;
import android.graphics.SweepGradient;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.AttributeSet;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.LinearInterpolator;

/**
 * Native port of the website's BrandLoader component.
 *  - Conic-gradient halo spinning behind the logo
 *  - Logo pulses with a soft drop-shadow
 *  - Wordmark "StudentsPlug" bounces letter-by-letter
 * Drives the splash overlay shown by MainActivity until the WebView finishes.
 */
public class BrandLoaderView extends View {

    private static final String LABEL = "StudentsPlug";
    private static final int LOGO_SIZE_DP = 88;

    private final Paint haloPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint logoPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Paint glowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Rect textBounds = new Rect();

    private Bitmap logo;
    private float haloAngle = 0f;
    private float pulse = 0f;     // 0..1..0 sine
    private long startNanos;

    private final ValueAnimator ticker = ValueAnimator.ofFloat(0f, 1f);

    public BrandLoaderView(Context c) { super(c); init(); }
    public BrandLoaderView(Context c, AttributeSet a) { super(c, a); init(); }
    public BrandLoaderView(Context c, AttributeSet a, int s) { super(c, a, s); init(); }

    private void init() {
        logo = BitmapFactory.decodeResource(getResources(), R.drawable.ic_brand_logo);

        textPaint.setTextSize(sp(20));
        textPaint.setFakeBoldText(true);
        textPaint.setColor(Color.WHITE);

        glowPaint.setColor(Color.parseColor("#4F46E5"));
        glowPaint.setMaskFilter(new BlurMaskFilter(dp(18), BlurMaskFilter.Blur.NORMAL));

        startNanos = System.nanoTime();
        ticker.setRepeatCount(ValueAnimator.INFINITE);
        ticker.setDuration(16);
        ticker.setInterpolator(new LinearInterpolator());
        ticker.addUpdateListener(a -> {
            long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;
            haloAngle = (elapsedMs % 1400L) / 1400f * 360f;
            float t = (elapsedMs % 1600L) / 1600f;
            pulse = (float) (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
            invalidate();
        });
    }

    @Override protected void onAttachedToWindow() { super.onAttachedToWindow(); ticker.start(); }
    @Override protected void onDetachedFromWindow() { ticker.cancel(); super.onDetachedFromWindow(); }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float cx = getWidth() / 2f;
        float cy = getHeight() / 2f - dp(20);

        float logoSize = dp(LOGO_SIZE_DP) * (1f + 0.08f * pulse);
        float haloRadius = logoSize / 2f + dp(12);

        // --- Conic halo (sweep gradient indigo → transparent) ---
        SweepGradient sweep = new SweepGradient(
                cx, cy,
                new int[] {
                        Color.parseColor("#004F46E5"),
                        Color.parseColor("#994F46E5"),
                        Color.parseColor("#004F46E5"),
                        Color.parseColor("#004F46E5")
                },
                new float[] { 0f, 0.5f, 0.7f, 1f }
        );
        haloPaint.setShader(sweep);
        haloPaint.setMaskFilter(new BlurMaskFilter(dp(8), BlurMaskFilter.Blur.NORMAL));
        canvas.save();
        canvas.rotate(haloAngle, cx, cy);
        canvas.drawCircle(cx, cy, haloRadius, haloPaint);
        canvas.restore();

        // --- Glow drop-shadow under the logo ---
        glowPaint.setAlpha((int) (140 * pulse));
        canvas.drawCircle(cx, cy + dp(6), logoSize / 2.4f, glowPaint);

        // --- Logo ---
        if (logo != null) {
            float half = logoSize / 2f;
            canvas.drawBitmap(
                    logo,
                    null,
                    new android.graphics.RectF(cx - half, cy - half, cx + half, cy + half),
                    logoPaint
            );
        }

        // --- Wordmark with per-letter bounce + indigo→amber gradient ---
        float gap = dp(1.5f);
        float totalWidth = 0;
        float[] charWidths = new float[LABEL.length()];
        for (int i = 0; i < LABEL.length(); i++) {
            String ch = String.valueOf(LABEL.charAt(i));
            charWidths[i] = textPaint.measureText(ch);
            totalWidth += charWidths[i] + gap;
        }
        totalWidth -= gap;

        textPaint.getTextBounds("S", 0, 1, textBounds);
        float baselineY = cy + logoSize / 2f + dp(40);
        float x = cx - totalWidth / 2f;

        LinearGradient gradient = new LinearGradient(
                0, baselineY - textBounds.height(),
                0, baselineY,
                Color.parseColor("#6366F1"),
                Color.parseColor("#F59E0B"),
                Shader.TileMode.CLAMP
        );
        textPaint.setShader(gradient);

        long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;
        for (int i = 0; i < LABEL.length(); i++) {
            float phase = ((elapsedMs + i * 60L) % 1600L) / 1600f;
            float bounce = (float) Math.sin(phase * Math.PI * 2) * dp(4);
            float alpha = 0.55f + 0.45f * (float) Math.abs(Math.sin(phase * Math.PI));
            textPaint.setAlpha((int) (alpha * 255));
            canvas.drawText(String.valueOf(LABEL.charAt(i)), x, baselineY - bounce, textPaint);
            x += charWidths[i] + gap;
        }
    }

    private float dp(float v) { return v * Resources.getSystem().getDisplayMetrics().density; }
    private float sp(float v) { return v * Resources.getSystem().getDisplayMetrics().scaledDensity; }
}