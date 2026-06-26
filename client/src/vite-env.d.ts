/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_CACHE_TTL_SECONDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
