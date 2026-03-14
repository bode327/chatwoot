// Prevents PostCSS from traversing up to Chatwoot's root directory
// and attempting to load missing modules like 'postcss-preset-env'
module.exports = {
  plugins: {}
};
