// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import '../build/globals.js'

const test = suite('cli')

$.verbose = false

test('prints version', async () => {
  assert.match((await $`node build/cli.js -v`).toString(), /\d+.\d+.\d+/)
})

test('prints help', async () => {
  let p = $`node build/cli.js -h`
  p.stdin.end()
  let help = await p
  assert.match(help.stdout, 'zx')
})

test('starts repl', async () => {
  let p = $`node build/cli.js`
  p.stdin.end()
  let out = await p
  assert.match(out.stdout, '❯')
})

test('starts repl with -i', async () => {
  let p = $`node build/cli.js -i`
  p.stdin.write('await $`echo f"o"o`\n')
  p.stdin.write('"b"+"ar"\n')
  p.stdin.end()
  let out = await p
  assert.match(out.stdout, 'foo')
  assert.match(out.stdout, 'bar')
})

test('supports `--experimental` flag', async () => {
  let out = await $`echo 'echo("test")' | node build/cli.js --experimental`
  assert.match(out.stdout, 'test')
})

test('supports `--quiet` flag', async () => {
  let p = await $`node build/cli.js test/fixtures/markdown.md`
  assert.ok(!p.stderr.includes('ignore'), 'ignore was printed')
  assert.ok(p.stderr.includes('hello'), 'no hello')
  assert.ok(p.stdout.includes('world'), 'no world')
})

test('supports `--shell` flag ', async () => {
  let shell = $.shell
  let p =
    await $`node build/cli.js --shell=${shell} <<< '$\`echo \${$.shell}\`'`
  assert.ok(p.stderr.includes(shell))
})

test('supports `--prefix` flag ', async () => {
  let prefix = 'set -e;'
  let p =
    await $`node build/cli.js --prefix=${prefix} <<< '$\`echo \${$.prefix}\`'`
  assert.ok(p.stderr.includes(prefix))
})

test('scripts from https', async () => {
  $`cat ${path.resolve('test/fixtures/echo.http')} | nc -l 8080`
  let out = await $`node build/cli.js http://127.0.0.1:8080/echo.mjs`
  assert.match(out.stderr, 'test')
})

test('scripts from https not ok', async () => {
  $`echo $'HTTP/1.1 500\n\n' | nc -l 8081`
  let out = await $`node build/cli.js http://127.0.0.1:8081`.nothrow()
  assert.match(out.stderr, "Error: Can't get")
})

test('scripts with no extension', async () => {
  await $`node build/cli.js test/fixtures/no-extension`
  assert.ok(
    /Test file to verify no-extension didn't overwrite similarly name .mjs file./.test(
      (await fs.readFile('test/fixtures/no-extension.mjs')).toString()
    )
  )
})

test('require() is working from stdin', async () => {
  let out =
    await $`node build/cli.js <<< 'console.log(require("./package.json").name)'`
  assert.match(out.stdout, 'zx')
})

test('require() is working in ESM', async () => {
  await $`node build/cli.js test/fixtures/require.mjs`
})

test('__filename & __dirname are defined', async () => {
  await $`node build/cli.js test/fixtures/filename-dirname.mjs`
})

test('markdown scripts are working', async () => {
  await $`node build/cli.js docs/markdown.md`
})

test('exceptions are caught', async () => {
  let out1 = await $`node build/cli.js <<<${'await $`wtf`'}`.nothrow()
  assert.match(out1.stderr, 'Error:')
  let out2 = await $`node build/cli.js <<<'throw 42'`.nothrow()
  assert.match(out2.stderr, '42')
})

test('eval works', async () => {
  assert.is((await $`node build/cli.js --eval '42'`).stdout, '42\n')
  assert.is((await $`node build/cli.js -e='69'`).stdout, '69\n')
})

test('eval works with stdin', async () => {
  let { stdout } =
    await $`printf "Hello world" | node build/cli.js --eval='stdin'`
  assert.is(stdout, 'Hello world\n')
})

test('eval works with async stdin', async () => {
  let p = $`(printf foo; sleep 0.1; printf bar) | FX_ASYNC_STDIN=true node build/cli.js --eval 'await stdin'`
  assert.is((await p).stdout, 'foobar\n')
})

test('eval works with newlines', async () => {
  let p = $`node build/cli.js -e 'console.log(1)\nawait 2'`
  assert.is((await p).stdout, '1\n2\n')
})

test('eval works with semicolon', async () => {
  let p = $`node build/cli.js -e 'console.log(1); await 2'`
  assert.is((await p).stdout, '1\n2\n')
})

test.run()