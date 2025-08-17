const { spawn } = require('node:child_process')

console.log('Running ESLint with --fix flag...')

const eslint = spawn('npx', ['eslint', '.', '--fix'], {
  cwd: process.cwd(),
  stdio: 'pipe',
})

let output = ''
let errorOutput = ''

eslint.stdout.on('data', data => {
  output += data.toString()
})

eslint.stderr.on('data', data => {
  errorOutput += data.toString()
})

eslint.on('close', code => {
  console.log('ESLint stdout:')
  console.log(output)

  if (errorOutput) {
    console.log('ESLint stderr:')
    console.log(errorOutput)
  }

  console.log(`ESLint process exited with code ${code}`)

  // Now run prettier
  console.log('\nRunning Prettier...')
  const prettier = spawn('npx', ['prettier', '--write', '.'], {
    cwd: process.cwd(),
    stdio: 'pipe',
  })

  let prettierOutput = ''

  prettier.stdout.on('data', data => {
    prettierOutput += data.toString()
  })

  prettier.on('close', code => {
    console.log('Prettier output:')
    console.log(prettierOutput)
    console.log(`Prettier process exited with code ${code}`)
  })
})
