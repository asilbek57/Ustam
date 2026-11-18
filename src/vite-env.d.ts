/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_CHAT_API?: string;   // chat server URL, default "/api/chat"
  readonly VITE_ROUTER?: string;     // "memory" for sandboxed previews
  readonly VITE_YANDEX_MAPS_KEY?: string; // Yandex Maps JS API v3 key; without it a schematic map is used
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
