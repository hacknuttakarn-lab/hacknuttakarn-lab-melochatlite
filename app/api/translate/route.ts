import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOOGLE_TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";

const ALLOWED_LANGUAGES = new Set([
  "th",
  "en",
  "de",
  "zh",
  "ja",
  "ko",
]);

function normalizeLanguage(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace("_", "-");

  const base = raw.split("-")[0];

  return ALLOWED_LANGUAGES.has(base)
    ? base
    : "";
}

export async function POST(request: NextRequest) {
  try {
    const apiKey =
      process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "TRANSLATION_NOT_CONFIGURED",
        },
        {
          status: 503,
        },
      );
    }

    const body = await request.json();

    const text =
      typeof body?.text === "string"
        ? body.text.trim()
        : "";

    const target =
      normalizeLanguage(body?.target);

    if (!text) {
      return NextResponse.json(
        {
          translatedText: "",
          detectedSourceLanguage: "",
          skipped: true,
        },
      );
    }

    if (!target) {
      return NextResponse.json(
        {
          error: "INVALID_TARGET_LANGUAGE",
        },
        {
          status: 400,
        },
      );
    }

    // Chat text only. Prevent this endpoint from being used for
    // unexpectedly large translation requests.
    if (text.length > 5000) {
      return NextResponse.json(
        {
          error: "TEXT_TOO_LONG",
        },
        {
          status: 400,
        },
      );
    }

    const response = await fetch(
      GOOGLE_TRANSLATE_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "X-Goog-Api-Key":
            apiKey,
        },

        body: JSON.stringify({
          q: text,
          target,
          format: "text",
        }),

        cache: "no-store",
      },
    );

    const payload =
      await response.json();

    if (!response.ok) {
      console.error(
        "[Melo Translation] Google API error",
        response.status,
        payload?.error?.message ??
          "Unknown translation error",
      );

      return NextResponse.json(
        {
          error: "TRANSLATION_FAILED",
        },
        {
          status:
            response.status >= 400 &&
            response.status < 500
              ? response.status
              : 502,
        },
      );
    }

    const result =
      payload?.data?.translations?.[0];

    const translatedText =
      typeof result?.translatedText === "string"
        ? result.translatedText
        : text;

    const detectedSourceLanguage =
      normalizeLanguage(
        result?.detectedSourceLanguage,
      );

    // If Google detects that the original message is already
    // in the user's preferred language, keep the original.
    if (
      detectedSourceLanguage &&
      detectedSourceLanguage === target
    ) {
      return NextResponse.json({
        translatedText: text,
        detectedSourceLanguage,
        skipped: true,
      });
    }

    return NextResponse.json({
      translatedText,
      detectedSourceLanguage,
      skipped: false,
    });
  } catch (error) {
    console.error(
      "[Melo Translation] route error",
      error,
    );

    return NextResponse.json(
      {
        error: "TRANSLATION_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
