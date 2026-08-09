module.exports = {
  '*.{js,jsx,ts,tsx,mjs,cjs}': ['eslint -c eslint.config.mjs --fix', 'prettier --config .prettierrc.js --write'],
  '*.{md,json,yml,yaml}': ['prettier --config .prettierrc.js --write'],
}
