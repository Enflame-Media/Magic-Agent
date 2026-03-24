import { defineConfig } from 'vite-plus/test/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
  },
  plugins: [tsconfigPaths()]
}); 