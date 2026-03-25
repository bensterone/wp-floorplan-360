/**
 * webpack.editor.js
 * Standalone build config for assets/js/editor.js only.
 * Completely independent of @wordpress/scripts.
 * Run via: npm run build:editor
 */
const path = require('path');

module.exports = {
    mode:    process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    entry:   path.resolve(__dirname, 'src/editor.js'),
    output: {
        filename: 'editor.js',
        path:     path.resolve(__dirname, 'assets/js'),
    },
    module: {
        rules: [
            {
                test:    /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader:  'babel-loader',
                    options: { presets: ['@babel/preset-env'] },
                },
            },
        ],
    },
};