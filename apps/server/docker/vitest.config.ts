import { defineConfig } from 'vite-plus/test/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
  },
  resolve: {
    tsconfigPaths: true,
  },
}); 