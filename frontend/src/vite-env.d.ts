/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin for split hosting (frontend on Netlify/Vercel, backend elsewhere).
   *  Leave unset for same-origin single-server / dev-proxy setups. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
