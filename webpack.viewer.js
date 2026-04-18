const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode:    process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    entry:   path.resolve(__dirname, 'src/iframe-viewer.js'),
    output:  {
        filename: 'iframe-viewer.js',
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
            {
                test: /\.css$/,
                use:  [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({ filename: '../css/iframe-viewer.css' }),
    ],
};
