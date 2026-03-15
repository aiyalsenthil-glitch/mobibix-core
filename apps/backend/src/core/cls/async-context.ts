import { AsyncLocalStorage } from 'async_hooks';

const store = new AsyncLocalStorage<Map<string, any>>();

export function runWithAsyncContext<T>(fn: () => T) {
  const map = new Map<string, any>();
  return store.run(map, fn as any);
}

export function setCtx(key: string, value: any) {
  const s = store.getStore();
  if (s) s.set(key, value);
}

export function getCtx(key: string) {
  return store.getStore()?.get(key);
}

export function clearCtx() {
  const s = store.getStore();
  s?.clear();
}
