// vetur.config.js - Para que Vetur use Vue 2
module.exports = {
  settings: {
    "vetur.useWorkspaceDependencies": true,
    "vetur.experimental.templateInterpolationService": true
  },
  projects: [
    {
      root: './',
      package: './package.json',
      tsconfig: './tsconfig.json',
      globalComponents: [
        './components/**/*.vue'
      ]
    }
  ]
}
