// @ts-check

/**
 * @param {Array<{ name?: string }>} list
 * @param {TranslationBankLike} translationBank
 * @returns {void}
 */
export function translateCommandListNames(list, translationBank) {
  if (!list) return;

  for (const command of list) {
    if (
      command.name &&
      typeof command.name === "string" &&
      command.name.trim()
    ) {
      const cached = translationBank.get(command.name);
      if (cached) {
        command.name = cached.translated;
      }
    }
  }
}
