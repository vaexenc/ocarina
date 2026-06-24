import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ignores: ["dist", "storybook-static", "playwright-report"]},
	{
		files: ["**/*.{ts,tsx}"],
		extends: [
			js.configs.recommended,
			...tseslint.configs.strictTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			ecmaVersion: 2022,
			globals: globals.browser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-confusing-void-expression": [
				"error",
				{ignoreArrowShorthand: true},
			],
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/restrict-template-expressions": ["error", {allowNumber: true}],
			"react-hooks/exhaustive-deps": "warn",
			"react-refresh/only-export-components": ["warn", {allowConstantExport: true}],
		},
	},
	// Config / tooling files run in Node and are outside the app's tsconfig.
	{
		files: ["*.{js,ts}"],
		extends: [tseslint.configs.disableTypeChecked],
		languageOptions: {
			globals: globals.node,
		},
	},
	// Playwright e2e tests run in Node via the Playwright runner.
	{
		files: ["e2e/**/*.ts"],
		languageOptions: {
			globals: globals.node,
		},
	}
);
