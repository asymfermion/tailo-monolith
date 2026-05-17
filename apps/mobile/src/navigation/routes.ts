export type RootStackParamList = {
  Home: undefined;
};

export type RootRouteName = keyof RootStackParamList;

export type RootRoute<RouteName extends RootRouteName = RootRouteName> = {
  key: string;
  name: RouteName;
  params: RootStackParamList[RouteName];
};

export const INITIAL_ROUTE_NAME = 'Home' satisfies RootRouteName;
