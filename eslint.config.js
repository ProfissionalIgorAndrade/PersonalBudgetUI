/**
 * Minimal lint gate. Scoped deliberately to correctness rules that the
 * production build cannot catch: `vite build` compiles a component that
 * references an undeclared identifier without complaint, and the
 * ReferenceError only surfaces at render time.
 *
 * Style rules are intentionally absent - this is a safety net, not a
 * formatter.
 */
export default [
  {
    /**
     * Legacy trees, superseded by src/presentation, src/core, src/data and
     * src/application and imported by nothing. They were deleted once and
     * came back with the revert in #3.
     *
     * They are ignored rather than fixed because they are scheduled for
     * deletion. Note that src/components/accounts/Accounts.jsx references an
     * undefined ACC_TYPES - it would throw on render if anything mounted it,
     * which is a fair indication of how live this code is.
     */
    ignores: ['src/components/**', 'src/utils/**', 'src/api/**', 'src/hooks/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: 'readonly', document: 'readonly', console: 'readonly',
        localStorage: 'readonly', sessionStorage: 'readonly',
        fetch: 'readonly', navigator: 'readonly', location: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly', Blob: 'readonly',
        FileReader: 'readonly', ResizeObserver: 'readonly',
        Intl: 'readonly', crypto: 'readonly', alert: 'readonly',
        atob: 'readonly', btoa: 'readonly', CustomEvent: 'readonly',
        File: 'readonly', FileList: 'readonly', Blob: 'readonly',
        Event: 'readonly', CustomEventInit: 'readonly',
        confirm: 'readonly', prompt: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^React$' }],
    },
  },
];
