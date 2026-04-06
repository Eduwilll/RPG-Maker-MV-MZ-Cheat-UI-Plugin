declare interface TranslationCacheEntry {
  original: string;
  translated: string;
  timestamp: number;
  source: string;
}

declare interface CheatDataEntry {
  name?: string;
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
  [key: string]: any;
}

declare interface CheatMapInfoEntry {
  name?: string;
  _originalName?: string;
  [key: string]: any;
}

declare interface CheatSystemTerms {
  basic: string[];
  commands: string[];
  params: string[];
  messages: Record<string, string>;
}

declare interface CheatSystemData {
  gameTitle?: string;
  variables: string[];
  switches: string[];
  armorTypes?: string[];
  weaponTypes?: string[];
  skillTypes?: string[];
  elements?: string[];
  terms: CheatSystemTerms;
  _originalTermsBasic?: string[];
  _originalTermsCommands?: string[];
  _originalTermsParams?: string[];
  _originalTermsMessages?: Record<string, string>;
  _originalGameTitle?: string;
  _originalVariables?: string[];
  _originalSwitches?: string[];
  [key: string]: any;
}

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
  $dataItems?: Array<CheatDataEntry | null>;
  $dataWeapons?: Array<CheatDataEntry | null>;
  $dataArmors?: Array<CheatDataEntry | null>;
  $dataSkills?: Array<CheatDataEntry | null>;
  $dataStates?: Array<CheatDataEntry | null>;
  $dataClasses?: Array<CheatDataEntry | null>;
  $dataEnemies?: Array<CheatDataEntry | null>;
  $dataActors?: Array<CheatDataEntry | null>;
  $dataMapInfos?: Array<CheatMapInfoEntry | null>;
  $dataSystem?: CheatSystemData;
}

declare module "nw.gui" {
  const gui: any;
  export = gui;
}
