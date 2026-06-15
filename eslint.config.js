import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
	{ignores: ["dist"]},
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
			"@typescript-eslint/no-confusing-void-expression": ["error", {ignoreArrowShorthand: true}],
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/restrict-template-expressions": ["error", {allowNumber: true}],
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
	}
);
