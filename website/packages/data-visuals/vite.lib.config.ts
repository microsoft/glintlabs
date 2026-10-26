import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-lib',
    lib: {
      entry: 'src/lib/index.ts',
      formats: ['es'],
      fileName: 'glint-labs-data-visuals',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        banner: '"use client";',
      },
    },
  },
})
