import tseslint from 'typescript-eslint';

export default tseslint.config(
  {ignores:['dist/**','node_modules/**','qa/artifacts/**']},
  {
    files:['src/**/*.ts','tests/**/*.ts','vite.config.ts'],
    extends:[tseslint.configs.recommended]
  }
);
