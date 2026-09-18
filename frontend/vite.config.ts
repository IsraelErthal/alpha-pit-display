import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Google's OAuth popup (used by signInWithPopup) sends its own strict COOP
// header, which otherwise isolates it from this app's window and breaks
// Firebase's popup-closed detection ("Cross-Origin-Opener-Policy policy would
// block the window.closed call"). Opting this origin into
// same-origin-allow-popups keeps the opener/popup relationship intact.
const headers = { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' };

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, headers },
  preview: { headers },
});
