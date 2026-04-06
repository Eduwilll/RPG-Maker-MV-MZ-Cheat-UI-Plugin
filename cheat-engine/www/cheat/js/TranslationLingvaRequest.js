// @ts-check

import { TRANSLATION_METRICS } from "./TranslationBank.js";

/** @type {number | undefined} */
let lastPublicRequestAt = undefined;

/**
 * @param {Record<string, any>} endPointData
 * @param {string} text
 * @param {number | undefined} rrIndex
 * @returns {Promise<{ translated: string, rrIndex: number }>}
 */
export async function translateWithLingvaEndpoint(endPointData, text, rrIndex) {
  const sourceLang = endPointData.sourceLang || "auto";
  const domains = endPointData.isLocal
    ? (endPointData.localDomain || "http://localhost:3000").split(",")
    : ["https://lingva.ml"];

  let nextIndex = typeof rrIndex === "number" ? rrIndex : 0;
  const maxAttempts = endPointData.isLocal ? 2 : 4;

  if (!endPointData.isLocal) {
    const now = Date.now();
    const minGap = 1500;
    if (typeof lastPublicRequestAt === "undefined") {
      lastPublicRequestAt = 0;
    }
    const elapsed = now - lastPublicRequestAt;
    if (elapsed < minGap) {
      await new Promise((resolve) => setTimeout(resolve, minGap - elapsed));
    }
    lastPublicRequestAt = Date.now();
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const baseDomain = domains[nextIndex % domains.length].trim();
    nextIndex++;

    const endpoint = `${baseDomain}/api/v1/${sourceLang}/en/${encodeURIComponent(text)}`;
    const reqStart = Date.now();

    try {
      const response = await axios.get(endpoint, {
        timeout: 30000,
        headers: { Accept: "application/json" },
      });

      TRANSLATION_METRICS.recordRequest(baseDomain, Date.now() - reqStart);

      if (
        response.data &&
        response.data.translation &&
        response.data.translation !== text
      ) {
        return { translated: response.data.translation, rrIndex: nextIndex };
      }
      break;
    } catch (error) {
      const latency = Date.now() - reqStart;
      TRANSLATION_METRICS.recordRequest(baseDomain, latency);

      const msg = error.message || "";
      const isTimeout = msg.includes("timeout");
      const isRateLimit = msg.includes("429");

      if (isRateLimit) TRANSLATION_METRICS.recordError("429");
      else if (msg.includes("431") || msg.includes("414")) {
        TRANSLATION_METRICS.recordError("431");
      } else if (msg.includes("404")) {
        TRANSLATION_METRICS.recordError("404");
      } else if (msg.includes("500")) {
        TRANSLATION_METRICS.recordError("500");
      } else if (isTimeout) {
        TRANSLATION_METRICS.recordError("timeout");
      } else {
        TRANSLATION_METRICS.recordError("other");
      }

      if (isRateLimit && attempt < maxAttempts - 1) {
        const backoff = Math.min(5000 * Math.pow(2, attempt), 30000);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      if (isTimeout && endPointData.isLocal && attempt === 0) {
        continue;
      }

      if (endPointData.isLocal) {
        return { translated: text, rrIndex: nextIndex };
      }

      try {
        const fallbackEndpoint = `https://translate.plausibility.cloud/api/v1/${sourceLang}/en/${encodeURIComponent(text)}`;
        const fallbackResponse = await axios.get(fallbackEndpoint, {
          timeout: 10000,
          headers: { Accept: "application/json" },
        });
        if (
          fallbackResponse.data &&
          fallbackResponse.data.translation &&
          fallbackResponse.data.translation !== text
        ) {
          return {
            translated: fallbackResponse.data.translation,
            rrIndex: nextIndex,
          };
        }
      } catch (fallbackError) {
        // fallback failed too
      }
      break;
    }
  }

  return { translated: text, rrIndex: nextIndex };
}
