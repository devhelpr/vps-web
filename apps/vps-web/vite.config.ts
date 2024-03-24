/// <reference types="vitest" />
import { defineConfig } from 'vite';
//import jsxCompiler from './vite/vite-plugin-jsx-compiler';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
//import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  root: __dirname,
  build: {
    outDir: '../../dist/apps/vps-web',
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    port: 4200,
    host: 'localhost',
    //host: '192.168.68.109',
    //https: true,
  },

  plugins: [nxViteTsPaths()], //mkcert()
  esbuild: {
    sourcemap: false,
  },

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [
  //    viteTsConfigPaths({
  //      root: '../../',
  //    }),
  //  ],
  // },

  test: {
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/vps-web',
      provider: 'v8',
    },
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },

  // esbuild: {
  //   jsxFactory: 'h',
  //   jsxFragment: 'Fragment',
  // },
});
