/** Primary tabs shown in the main shell (3.0). */
export type MainTabId = 'Timeline' | 'PetProfile' | 'Settings';

export const INITIAL_MAIN_TAB = 'Timeline' satisfies MainTabId;

/** Tab order for the main pager (left → right). */
export const MAIN_TAB_ORDER = [
  'Timeline',
  'PetProfile',
  'Settings',
] as const satisfies readonly MainTabId[];

/** Full-screen flows pushed above the tab shell (3.0.4). */
export type ModalStackParamList = {
  AccountSettings: undefined;
  EventDetail: {
    localEventId: string;
  };
  Capture: undefined;
  CapturePreview: {
    tempUri: string;
    width: number;
    height: number;
  };
};

export type ModalRouteName = keyof ModalStackParamList;

type RouteBase = {
  key: string;
};

export type ModalRoute =
  | (RouteBase & {
      name: 'AccountSettings';
      params: ModalStackParamList['AccountSettings'];
    })
  | (RouteBase & {
      name: 'EventDetail';
      params: ModalStackParamList['EventDetail'];
    })
  | (RouteBase & { name: 'Capture'; params: ModalStackParamList['Capture'] })
  | (RouteBase & {
      name: 'CapturePreview';
      params: ModalStackParamList['CapturePreview'];
    });

/** @deprecated Use MainTabId + ModalRouteName. Kept for gradual migration in tests. */
export type RootStackParamList = {
  Home: undefined;
  AccountSettings: undefined;
  EventDetail: ModalStackParamList['EventDetail'];
  Capture: undefined;
  CapturePreview: ModalStackParamList['CapturePreview'];
};

export type RootRouteName = keyof RootStackParamList;

export type RootRoute = ModalRoute;
