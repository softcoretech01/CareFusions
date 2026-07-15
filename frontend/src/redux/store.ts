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
  whitelist: ['auth', 'theme'], // Only persist auth and theme
};

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
