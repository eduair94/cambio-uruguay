export interface AlertSpec {
  currency: string;
  kind: "bestBuy" | "bestSell";
  op: "<" | ">" | "<=" | ">=";
  target: number;
}

/** Thin client over the app's secret-authenticated internal Telegram API. */
export class AppClient {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async post(path: string, body: unknown): Promise<any> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-secret": this.secret },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => ({}));
  }

  private async get(path: string): Promise<any> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { "x-telegram-secret": this.secret },
    });
    return res.json().catch(() => ({}));
  }

  link(code: string, chatId: string) {
    return this.post("/api/telegram/link", { code, chatId });
  }
  unlink(chatId: string) {
    return this.post("/api/telegram/unlink", { chatId });
  }
  alerts(chatId: string) {
    return this.get(`/api/telegram/alerts?chatId=${encodeURIComponent(chatId)}`);
  }
  favorites(chatId: string) {
    return this.get(`/api/telegram/favorites?chatId=${encodeURIComponent(chatId)}`);
  }
  createAlert(chatId: string, spec: AlertSpec) {
    return this.post("/api/telegram/alert", { chatId, ...spec });
  }
}
