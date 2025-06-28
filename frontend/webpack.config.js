/**
 * Custom webpack configuration to optimize memory usage
 * This helps prevent ENOMEM errors in Docker environment
 */

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  // Use production optimizations in development to reduce memory usage
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: 2, // Reduce parallel processes to save memory
        terserOptions: {
          compress: {
            // Basic compression options
            unused: true,
            dead_code: true,
            conditionals: true,
            evaluate: true,
          },
          output: {
            comments: false,
          },
        },
      }),
    ],
    // Split chunks for better caching and smaller memory footprint
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 10,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  // Improve memory usage of webpack file watching
  watchOptions: {
    // Use polling with a reasonable interval
    poll: process.env.WATCHPACK_POLLING === 'true' ? 1000 : false,
    // Ignore large folders to reduce memory usage
    ignored: [
      '**/node_modules',
      '**/__tests__',
      '**/__mocks__',
      '**/dist',
      '**/build'
    ],
    // Aggregate file watchers to prevent too many open file handles
    aggregateTimeout: 300,
  },
  // Add performance hints
  performance: {
    hints: 'warning',
    maxAssetSize: 250000,
    maxEntrypointSize: 400000,
  }
};
