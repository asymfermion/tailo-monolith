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
export type CapturePurpose = 'timelineMoment' | 'petProfilePhoto';

export type ModalStackParamList = {
  AccountSettings:
    | {
        mode?: 'link' | 'create';
        /** Dismiss this modal to reveal sign-in (login gate underlay) instead of stacking Login. */
        signInPresentation?: 'pop';
      }
    | undefined;
  Login:
    | {
        variant?: 'welcome' | 'locked';
      }
    | undefined;
  ForgotPassword: undefined;
  EventDetail: {
    localEventId: string;
  };
  Capture:
    | {
        purpose?: CapturePurpose;
      }
    | undefined;
  CapturePreview: {
    tempUri: string;
    width: number;
    height: number;
    purpose?: CapturePurpose;
  };
  NotificationsInbox: undefined;
  NotificationSettings: undefined;
  PetProfileDetails: undefined;
  PrivacyPermissions: undefined;
  PrivacyPolicy: undefined;
  DataProcessingDetails: undefined;
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
      name: 'Login';
      params: ModalStackParamList['Login'];
    })
  | (RouteBase & {
      name: 'ForgotPassword';
      params: ModalStackParamList['ForgotPassword'];
    })
  | (RouteBase & {
      name: 'EventDetail';
      params: ModalStackParamList['EventDetail'];
    })
  | (RouteBase & { name: 'Capture'; params: ModalStackParamList['Capture'] })
  | (RouteBase & {
      name: 'CapturePreview';
      params: ModalStackParamList['CapturePreview'];
    })
  | (RouteBase & {
      name: 'NotificationsInbox';
      params: ModalStackParamList['NotificationsInbox'];
    })
  | (RouteBase & {
      name: 'NotificationSettings';
      params: ModalStackParamList['NotificationSettings'];
    })
  | (RouteBase & {
      name: 'PetProfileDetails';
      params: ModalStackParamList['PetProfileDetails'];
    })
  | (RouteBase & {
      name: 'PrivacyPermissions';
      params: ModalStackParamList['PrivacyPermissions'];
    })
  | (RouteBase & {
      name: 'PrivacyPolicy';
      params: ModalStackParamList['PrivacyPolicy'];
    })
  | (RouteBase & {
      name: 'DataProcessingDetails';
      params: ModalStackParamList['DataProcessingDetails'];
    });

/** @deprecated Use MainTabId + ModalRouteName. Kept for gradual migration in tests. */
export type RootStackParamList = {
  Home: undefined;
  AccountSettings: ModalStackParamList['AccountSettings'];
  Login: ModalStackParamList['Login'];
  ForgotPassword: undefined;
  EventDetail: ModalStackParamList['EventDetail'];
  Capture: undefined;
  CapturePreview: ModalStackParamList['CapturePreview'];
  NotificationsInbox: undefined;
  NotificationSettings: undefined;
  PetProfileDetails: undefined;
  PrivacyPermissions: undefined;
  PrivacyPolicy: undefined;
  DataProcessingDetails: undefined;
};

export type RootRouteName = keyof RootStackParamList;

export type RootRoute = ModalRoute;
