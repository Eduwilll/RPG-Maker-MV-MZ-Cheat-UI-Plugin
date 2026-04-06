// @ts-check

export const END_POINT_URL_PATTERN_TEXT_SYMBOL = "${TEXT}";

export const DEFAULT_END_POINTS = {
  ezTransWeb: {
    id: "ezTransWeb",
    name: "ezTransWeb (JP → KR)",
    helpUrl: "https://github.com/HelloKS/ezTransWeb",
    data: {
      method: "get",
      urlPattern: `http://localhost:5000/translate?text=${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
    },
  },
  ezTransServer: {
    id: "ezTransServer",
    name: "eztrans-server (JP → KR)",
    helpUrl: "https://github.com/nanikit/eztrans-server",
    data: {
      method: "post",
      urlPattern: "http://localhost:8000",
      body: END_POINT_URL_PATTERN_TEXT_SYMBOL,
    },
  },
  lingva: {
    id: "lingva",
    name: "Lingva Translate (Auto-detect → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingva",
      method: "get",
      urlPattern: `https://lingva.ml/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "auto",
    },
  },
  lingvaJa: {
    id: "lingvaJa",
    name: "Lingva Translate (JA → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaJa",
      method: "get",
      urlPattern: `https://lingva.ml/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "ja",
    },
  },
  lingvaLocal: {
    id: "lingvaLocal",
    name: "Local Lingva Docker (localhost:3000, JA → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaLocal",
      method: "get",
      urlPattern: `http://localhost:3000/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "ja",
      isLocal: true,
    },
  },
  lingvaLocalAuto: {
    id: "lingvaLocalAuto",
    name: "Local Lingva Docker (localhost:3000, Auto-detect → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaLocalAuto",
      method: "get",
      urlPattern: `http://localhost:3000/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "auto",
      isLocal: true,
      localDomain: "http://localhost:3000",
    },
  },
  lingvaLocalBalanced: {
    id: "lingvaLocalBalanced",
    name: "Local Lingva Docker (Ports 3000, 3001, 3002 Load Balanced, JA → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaLocalBalanced",
      method: "get",
      urlPattern: `http://localhost:3000/api/v1/ja/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "ja",
      isLocal: true,
      localDomain:
        "http://localhost:3000,http://localhost:3001,http://localhost:3002",
    },
  },
  lingvaLocalBalancedAuto: {
    id: "lingvaLocalBalancedAuto",
    name: "Local Lingva Docker (Ports 3000, 3001, 3002 Load Balanced, Auto → EN)",
    helpUrl: "https://github.com/thedaviddelta/lingva-translate",
    data: {
      id: "lingvaLocalBalancedAuto",
      method: "get",
      urlPattern: `http://localhost:3000/api/v1/auto/en/${END_POINT_URL_PATTERN_TEXT_SYMBOL}`,
      isLingva: true,
      sourceLang: "auto",
      isLocal: true,
      localDomain:
        "http://localhost:3000,http://localhost:3001,http://localhost:3002",
    },
  },
  ollamaLocal: {
    id: "ollamaLocal",
    name: "🤖 Ollama Local LLM (localhost:11434, JA → EN)",
    helpUrl: "https://ollama.com",
    data: {
      id: "ollamaLocal",
      isLLM: true,
      isLocal: true,
      apiUrl: "http://localhost:11434/v1/chat/completions",
      model: "qwen3:8b",
      sourceLang: "Japanese",
      targetLang: "English",
    },
  },
  openai: {
    id: "openai",
    name: "🤖 OpenAI API (GPT-4o-mini, JA → EN)",
    helpUrl: "https://platform.openai.com/api-keys",
    data: {
      id: "openai",
      isLLM: true,
      isLocal: false,
      apiUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      sourceLang: "Japanese",
      targetLang: "English",
      requiresApiKey: true,
    },
  },
  googleGemini: {
    id: "googleGemini",
    name: "🤖 Google Gemini API (JA → EN)",
    helpUrl: "https://aistudio.google.com/app/apikey",
    data: {
      id: "googleGemini",
      isLLM: true,
      isLocal: false,
      apiUrl:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: "gemini-2.0-flash",
      sourceLang: "Japanese",
      targetLang: "English",
      requiresApiKey: true,
    },
  },
  llmCustom: {
    id: "llmCustom",
    name: "🤖 Custom LLM API (OpenAI-compatible)",
    helpUrl: "https://ollama.com",
    data: {
      id: "llmCustom",
      isLLM: true,
      isLocal: true,
      apiUrl: "http://localhost:11434/v1/chat/completions",
      model: "qwen3:8b",
      sourceLang: "Japanese",
      targetLang: "English",
    },
  },
};

export const RECOMMEND_CHUNK_SIZE = {
  ezTransWeb: 500,
  ezTransServer: 100,
  lingva: 10,
  lingvaJa: 10,
  lingvaLocal: 50,
  lingvaLocalAuto: 50,
  lingvaLocalBalanced: 100,
  lingvaLocalBalancedAuto: 100,
  ollamaLocal: 100,
  openai: 100,
  googleGemini: 100,
  llmCustom: 100,
};

export const MAX_CHUNK_SIZE = {
  ezTransWeb: 1000,
  ezTransServer: 500,
  lingva: 20,
  lingvaJa: 20,
  lingvaLocal: 100,
  lingvaLocalAuto: 100,
  lingvaLocalBalanced: 200,
  lingvaLocalBalancedAuto: 200,
  ollamaLocal: 200,
  openai: 200,
  googleGemini: 200,
  llmCustom: 200,
};

export const MAX_PARALLEL_REQUESTS = {
  ezTransWeb: 50,
  ezTransServer: 20,
  lingva: 1,
  lingvaJa: 1,
  lingvaLocal: 30,
  lingvaLocalAuto: 30,
  lingvaLocalBalanced: 30,
  lingvaLocalBalancedAuto: 30,
  ollamaLocal: 3,
  openai: 10,
  googleGemini: 10,
  llmCustom: 3,
};

export const BATCH_TRANSLATION = {
  delimiter: " ⟨SEP⟩ ",
  maxBatchLength: {
    lingva: 500,
    lingvaJa: 500,
    lingvaLocal: 800,
    lingvaLocalAuto: 800,
    lingvaLocalBalanced: 800,
    lingvaLocalBalancedAuto: 800,
    ollamaLocal: 3000,
    openai: 4000,
    googleGemini: 4000,
    llmCustom: 3000,
  },
  maxBatchItems: {
    lingva: 20,
    lingvaJa: 20,
    lingvaLocal: 40,
    lingvaLocalAuto: 40,
    lingvaLocalBalanced: 50,
    lingvaLocalBalancedAuto: 50,
    ollamaLocal: 50,
    openai: 80,
    googleGemini: 80,
    llmCustom: 50,
  },
  excludeFromBatch: ["ezTransWeb", "ezTransServer"],
};
