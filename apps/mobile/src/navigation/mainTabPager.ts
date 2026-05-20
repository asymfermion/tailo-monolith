import { MAIN_TAB_ORDER, type MainTabId } from './routes';

export function getMainTabIndex(tab: MainTabId): number {
  const index = MAIN_TAB_ORDER.indexOf(tab);

  return index >= 0 ? index : 0;
}

export function getMainTabFromIndex(index: number): MainTabId {
  return MAIN_TAB_ORDER[index] ?? MAIN_TAB_ORDER[0];
}
