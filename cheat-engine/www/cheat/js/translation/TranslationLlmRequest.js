// @ts-check

import { TRANSLATION_METRICS } from "./TranslationBank.js";

/**
 * @param {Record<string, any>} endPointData
 * @param {Record<string, any>} llmConfig
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function translateWithLlmEndpoint(endPointData, llmConfig, text) {
  const apiUrl = llmConfig.apiUrl || endPointData.apiUrl;
  const model = llmConfig.model || endPointData.model;
  const apiKey = llmConfig.apiKey || "";
  const sourceLang = endPointData.sourceLang || "Japanese";
  const targetLang = endPointData.targetLang || "English";

  const systemPrompt =
    llmConfig.systemPrompt ||
    `You are a professional RPG game translator. Translate the following ${sourceLang} game text to ${targetLang}.\n\nRules:\n- Translate ONLY the text, output NOTHING else (no explanations, no notes)\n- Preserve the delimiter âŸ¨SEPâŸ© exactly as-is between translated segments\n- Keep game variables like \\V[123], \\N[1], %1, %2 unchanged\n- Keep newline characters (\\n) unchanged\n- Maintain the tone and personality of game dialogue\n- For RPG terms (skills, items, spells), use natural English equivalents\n- Do NOT add quotes around the translation`;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    temperature: 0.3,
    max_tokens: Math.max(text.length * 3, 500),
  };

  const reqStart = Date.now();

  try {
    const response = await axios.post(apiUrl, requestBody, {
      timeout: 60000,
      headers: headers,
    });

    TRANSLATION_METRICS.recordRequest(apiUrl, Date.now() - reqStart);

    if (response.data && response.data.choices && response.data.choices[0]) {
      const translated = response.data.choices[0].message.content.trim();
      if (translated && translated !== text) {
        return translated;
      }
    }
  } catch (error) {
    const latency = Date.now() - reqStart;
    TRANSLATION_METRICS.recordRequest(apiUrl, latency);

    const msg = error.message || "";
    if (msg.includes("429")) TRANSLATION_METRICS.recordError("429");
    else if (msg.includes("401") || msg.includes("403")) {
      TRANSLATION_METRICS.recordError("other");
    } else if (msg.includes("timeout")) {
      TRANSLATION_METRICS.recordError("timeout");
    } else {
      TRANSLATION_METRICS.recordError("other");
    }

    if (msg.includes("429")) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const retryResponse = await axios.post(apiUrl, requestBody, {
          timeout: 60000,
          headers,
        });

        if (
          retryResponse.data &&
          retryResponse.data.choices &&
          retryResponse.data.choices[0]
        ) {
          return retryResponse.data.choices[0].message.content.trim();
        }
      } catch (retryError) {
        // retry failed
      }
    }
  }

  return text;
}
