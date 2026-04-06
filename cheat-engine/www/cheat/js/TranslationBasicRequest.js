// @ts-check

import { END_POINT_URL_PATTERN_TEXT_SYMBOL } from "./TranslationConfig.js";

/**
 * @param {Record<string, any>} endPointData
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function translateWithBasicEndpoint(endPointData, text) {
  const encodedText = encodeURI(text);
  const realUrl = endPointData.urlPattern.replace(
    END_POINT_URL_PATTERN_TEXT_SYMBOL,
    encodedText,
  );

  let response;
  try {
    if (endPointData.method === "get") {
      response = (await axios.get(realUrl)).data;
    } else if (endPointData.method === "post") {
      const body = endPointData.body ? endPointData.body : "";
      response = (
        await axios.post(
          realUrl,
          body.replace(END_POINT_URL_PATTERN_TEXT_SYMBOL, text),
        )
      ).data;
    } else {
      return text;
    }
  } catch (error) {
    console.warn("Translation request failed:", error.message);
    return text;
  }

  return response || text;
}
