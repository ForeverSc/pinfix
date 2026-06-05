const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const pinfix = require('@pinfix/plugin/webpack')

module.exports = {
  entry: './src/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
    pinfix({ debug: true }),
  ],
  devServer: {
    port: 3001,
    hot: true,
  },
}
