declare type EngineName = "MV" | "MZ" | string;

declare interface NwWindowApi {
  get(): { showDevTools(): void };
  open(
    url: string,
    options: Record<string, any>,
    callback?: (win: { window: Window; on(event: string, fn: (...args: any[]) => void): void }) => void,
  ): void;
}

declare interface NwGlobalLike {
  Window: NwWindowApi;
}

declare interface AxiosLike {
  get(url: string, config?: Record<string, any>): Promise<{ data: any }>;
  post(url: string, body?: any, config?: Record<string, any>): Promise<{ data: any }>;
}

declare interface UtilsLike {
  RPGMAKER_NAME: EngineName;
  isNwjs(): boolean;
}

declare interface MvTouchInputLike {
  _events: {
    wheelX: number;
    wheelY: number;
  };
  _onWheel(event?: WheelEvent): void;
  _onMouseDown(event: MouseEvent): void;
}

declare interface MzTouchInputLike {
  _newState: {
    wheelX: number;
    wheelY: number;
  };
  _onWheel(event?: WheelEvent): void;
  _onMouseDown(event: MouseEvent): void;
}

declare var nw: NwGlobalLike;
declare var axios: AxiosLike;
declare var event: WheelEvent;
declare var TouchInput: MvTouchInputLike & MzTouchInputLike;
declare var Utils: UtilsLike;
