export type RootStackParamList = {
  Home: undefined;
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

export type RootRouteName = keyof RootStackParamList;

type RouteBase = {
  key: string;
};

export type RootRoute =
  | (RouteBase & { name: 'Home'; params: RootStackParamList['Home'] })
  | (RouteBase & {
      name: 'AccountSettings';
      params: RootStackParamList['AccountSettings'];
    })
  | (RouteBase & {
      name: 'EventDetail';
      params: RootStackParamList['EventDetail'];
    })
  | (RouteBase & { name: 'Capture'; params: RootStackParamList['Capture'] })
  | (RouteBase & {
      name: 'CapturePreview';
      params: RootStackParamList['CapturePreview'];
    });

export const INITIAL_ROUTE_NAME = 'Home' satisfies RootRouteName;
