declare interface TranslationCacheEntry {
  original: string;
  translated: string;
  timestamp: number;
  source: string;
}

declare interface CheatExtendedDataFields {
  description?: string;
  nickname?: string;
  profile?: string;
  message1?: string;
  message2?: string;
  message3?: string;
  message4?: string;
  _originalName?: string;
  _originalDescription?: string;
  _originalNickname?: string;
  _originalProfile?: string;
  _original_message1?: string;
  _original_message2?: string;
  _original_message3?: string;
  _original_message4?: string;
}

declare interface CheatDataEntry extends CheatExtendedDataFields {
  [key: string]: any;
}

interface BaseData extends CheatExtendedDataFields {}
interface DataActor extends CheatExtendedDataFields {}
interface DataClass extends CheatExtendedDataFields {}
interface DataEnemy extends CheatExtendedDataFields {}
interface DataItem extends CheatExtendedDataFields {}
interface DataWeapon extends CheatExtendedDataFields {}
interface DataArmor extends CheatExtendedDataFields {}
interface DataSkill extends CheatExtendedDataFields {}
interface DataState extends CheatExtendedDataFields {}

interface DataMapInfo {
  _originalName?: string;
}

declare interface CheatMapInfoEntry extends DataMapInfo {
  [key: string]: any;
}

interface DataSystem {
  _originalTermsBasic?: string[];
  _originalTermsCommands?: string[];
  _originalTermsParams?: string[];
  _originalTermsMessages?: Record<string, string>;
  _originalGameTitle?: string;
  _originalVariables?: string[];
  _originalSwitches?: string[];
}

declare interface CheatSystemTerms extends RPG.Terms {}
declare interface CheatSystemData extends DataSystem {}

declare interface TranslationBankLike {
  get(text: string): TranslationCacheEntry | null;
}

declare interface TranslateSettingsLike {
  isEnabled(): boolean;
  getTargets(): Record<string, boolean>;
}

declare interface GeneralCheatLike {
  toggleCheatModal?: (componentName?: string | null) => void;
  openCheatModal?: (componentName?: string | null) => void;
  openCheatWindow?: (componentName?: string | null) => void;
  __cheatWindow?: Window | null;
  [key: string]: any;
}

declare var event: WheelEvent;

interface Window {
  TRANSLATION_BANK?: TranslationBankLike;
  TRANSLATE_SETTINGS?: TranslateSettingsLike;
  GeneralCheat?: GeneralCheatLike;
}

declare module "nw.gui" {
  const gui: any;
  export = gui;
}
