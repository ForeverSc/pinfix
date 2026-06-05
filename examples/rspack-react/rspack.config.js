const path = require('path')
const { HtmlRspackPlugin } = require('@rspack/core')
const pinfix = require('pinfix/rspack')

/** @type {import('@rspack/core').Configuration} */
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
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    new HtmlRspackPlugin({
      template: './index.html',
    }),
    pinfix({ debug: true }),
  ],
  devServer: {
    port: 3002,
  },
}
