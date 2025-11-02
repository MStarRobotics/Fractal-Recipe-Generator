/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    includeOnly: {
      path: ['^components', '^services', '^utils', '^contracts', '^server'],
    },
    exclude: {
      path: ['node_modules', '^dist', '^build'],
    },
    // Recognize TS/TSX as valid extensions
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    // Don't crash on unresolved to keep CI green; still useful for graph
    doNotFollow: {
      path: 'node_modules',
    },
    reporterOptions: {
      dot: {
        theme: {
          graph: {
            splines: 'spline',
            rankdir: 'LR',
          },
          modules: [
            {
              criteria: { source: 'components' },
              attributes: { color: 'lightblue', style: 'filled' },
            },
          ],
        },
      },
    },
  },
};
