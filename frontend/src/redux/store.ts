import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
// Custom storage adapter to prevent Vite CJS/ESM interop issues with redux-persist
const storage = {
  setItem: (key: string, value: string) => {
    window.localStorage.setItem(key, value);
    return Promise.resolve(true);
  },
  getItem: (key: string) => {
    const value = window.localStorage.getItem(key);
    return Promise.resolve(value);
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import { baseApi } from './api/baseApi';

const rootReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

const persistConfig = {
  key: 'techhms:root',
  version: 1,
  storage,
  // Only `theme` is persisted here.
  //
  // `auth` is deliberately NOT in this list. authSlice does its own persistence
  // so it can honour the "Remember me" checkbox: localStorage when it is ticked,
  // sessionStorage when it is not. redux-persist always writes to localStorage,
  // so whitelisting `auth` here silently defeated that — an unticked "Remember
  // me" still survived a browser restart, and REHYDRATE could restore a session
  // the slice had already cleared. Leaving it out makes authSlice the single
  // source of truth (it rehydrates from cf_auth in its own initialState).
  whitelist: ['theme'],
};

// One-time cleanup: builds before the whitelist change wrote the auth slice
// (token, user, permissions) into the persisted root blob. It is no longer
// rehydrated, but leaving a stale session sitting in localStorage forever is
// not something we want, so strip it on boot.
try {
  const raw = window.localStorage.getItem('techhms:root');
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && 'auth' in parsed) {
      delete parsed.auth;
      window.localStorage.setItem('techhms:root', JSON.stringify(parsed));
    }
  }
} catch { /* corrupt or unavailable storage — nothing to clean */ }

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
