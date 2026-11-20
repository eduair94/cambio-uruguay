import { expect, test } from '@playwright/test'

test.setTimeout(180_000)

for (const width of [390, 1280]) {
  test(`directory question uses MCP products and offers a way back (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = []
    await page.route('https://js.puter.com/v2/', route =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.assistantTestCalls = [];
        window.puter = {
          auth: {
            isSignedIn: () => false,
            signIn: async () => ({ username: 'Prueba' }),
            getUser: async () => ({ username: 'Prueba' }),
            signOut: () => {}
          },
          ai: { chat: async (messages, testMode, options) => {
            window.assistantTestCalls.push({ messages, options });
            if (window.assistantTestCalls.length === 1) return { message: {
              role: 'assistant', content: '', tool_calls: [{ id: 'scooters', type: 'function',
                function: { name: 'search_products', arguments: JSON.stringify({
                  vertical: 'monopatines', brand: 'Xiaomi', condition: 'new', maxPriceUyu: 30000
                }) }
              }]
            }};
            return { message: { role: 'assistant', content:
              'Ofertas simuladas: [Ver monopatines filtrados](https://cambio-uruguay.com/monopatines-electricos-uruguay?marca=xiaomi&condicion=nuevo&precioMax=30000)' } };
          }}
        };`,
      })
    )
    await page.route('https://mcp.cambio-uruguay.com/**', async route => {
      const request = route.request().postDataJSON()
      let result: object
      if (request.method === 'initialize')
        result = { instructions: 'Consultá los catálogos públicos.' }
      else if (request.method === 'tools/list')
        result = {
          tools: [
            {
              name: 'search_products',
              description: 'Buscar avisos de productos',
              inputSchema: { type: 'object', properties: { vertical: { type: 'string' } } },
            },
          ],
        }
      else {
        toolCalls.push(request.params)
        result = { content: [{ type: 'text', text: 'Aviso simulado: Xiaomi, nuevo, 25000 UYU.' }] }
      }
      await route.fulfill({ json: { jsonrpc: '2.0', id: request.id, result } })
    })

    const q = 'Busco un monopatín Xiaomi nuevo de hasta $30.000.'
    await page.goto(`/asistente-ia?topic=monopatines&q=${encodeURIComponent(q)}`, {
      waitUntil: 'domcontentloaded',
    })
    const origin = page.getByTestId('assistant-origin')
    await expect(origin).toContainText('Monopatines eléctricos')
    await expect(origin.getByRole('link', { name: 'Volver al buscador' })).toHaveAttribute(
      'href',
      '/monopatines-electricos-uruguay'
    )
    const directories = page.getByTestId('assistant-directories')
    await expect(directories.getByRole('link', { name: 'Bicicletas eléctricas' })).toHaveAttribute(
      'href',
      '/bicicletas-electricas-uruguay'
    )
    await expect(page.getByTestId('assistant-pending-prompt')).toContainText(q)

    // Retry the interaction until hydration has attached the click handler.
    await expect(async () => {
      if (await page.getByRole('button', { name: 'Empezar', exact: true }).isVisible())
        await page.getByRole('button', { name: 'Empezar', exact: true }).click()
      await expect(page.locator('.answer')).toContainText('Ofertas simuladas', { timeout: 3000 })
    }).toPass({ timeout: 60_000 })
    expect(toolCalls).toEqual([
      {
        name: 'search_products',
        arguments: {
          vertical: 'monopatines',
          brand: 'Xiaomi',
          condition: 'new',
          maxPriceUyu: 30000,
        },
      },
    ])
    const calls = await page.evaluate(
      () =>
        (
          window as unknown as {
            assistantTestCalls: Array<{ messages: Array<{ role: string; content: string }> }>
          }
        ).assistantTestCalls
    )
    expect(calls[0]!.messages.find(message => message.role === 'system')?.content).toContain(
      'search_products, vertical="monopatines"'
    )
    expect(calls[0]!.messages.find(message => message.role === 'user')?.content).toBe(q)
    await expect(page.locator('.answer a')).toHaveAttribute('href', /marca=xiaomi/)
    expect(new URL(page.url()).searchParams.has('q')).toBe(false)
    expect(new URL(page.url()).searchParams.get('topic')).toBe('monopatines')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
    await directories.scrollIntoViewIfNeeded()
    await page.screenshot({ path: test.info().outputPath(`assistant-${width}.png`) })
  })
}

test('English directory links preserve the locale and reject an unknown origin', async ({
  page,
}) => {
  await page.route('https://js.puter.com/v2/', route => route.abort())
  await page.goto('/en/asistente-ia?topic=https%3A%2F%2Fexample.com', {
    waitUntil: 'domcontentloaded',
  })
  await expect(
    page.getByTestId('assistant-directories').getByRole('link', { name: 'Electric scooters' })
  ).toHaveAttribute('href', '/en/monopatines-electricos-uruguay')
  await expect(page.getByTestId('assistant-origin')).toHaveCount(0)
})
