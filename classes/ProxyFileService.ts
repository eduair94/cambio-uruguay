import axios from 'axios'
import fs from 'fs'
export class ProxyFileService {
  private static instance: ProxyFileService

  apiKey = process.env.PROXY_SCRAPE_API_KEY || ''

  file = 'proxy_scrape.json'
  
  private currentProxyIndex = 0

  public static getInstance() {
    if (!this.instance) this.instance = new ProxyFileService()
    return this.instance
  }

  private constructor() {
    console.log('Start Proxy Service')
  }

  public getProxyFileDate() {
    try {
      const proxyObj = JSON.parse(fs.readFileSync(this.file, 'utf-8'))
      const proxies = new Date(proxyObj.date)
      return proxies
    } catch {
      return null
    }
  }

  public getProxiesFile() {
    try {
      const proxyObj = JSON.parse(fs.readFileSync(this.file, 'utf-8'))
      const proxies = proxyObj.proxies as string[]
      return proxies
    } catch {
      return []
    }
  }

  public saveProxiesFile(proxies: string[]) {
    const json = { date: new Date(), proxies }
    fs.writeFileSync(this.file, JSON.stringify(json))
  }

  public async getProxies(): Promise<string[]> {
    try {
      const proxyDate = this.getProxyFileDate()
      // If last date is 10 minutes ago or less throw error so it gets the proxies from the file
      if (proxyDate && Date.now() - proxyDate.getTime() < 10 * 60 * 1000) {
        return this.getProxiesFile()
      }
      const proxies = await this.getProxiesApi()
      if (proxies && proxies.length) this.saveProxiesFile(proxies)
      return proxies
    } catch (e) {
      console.error(e?.response?.data || e.message)
      return this.getProxiesFile()
    }
  }

  public async getRandomProxy() {
    const proxies = await this.getProxies()
    console.log('Total proxies', proxies.length)
    const randomIndex = Math.floor(Math.random() * proxies.length)
    const random: string = proxies[randomIndex]
    if (!random) return ''
    return `socks5://${random}`
  }

  public async getNextProxy() {
    const proxies = await this.getProxies()
    if (proxies.length === 0) return ''
    
    const proxy = proxies[this.currentProxyIndex]
    this.currentProxyIndex = (this.currentProxyIndex + 1) % proxies.length
    
    if (!proxy) return ''
    return `socks5://${proxy}`
  }

  public async getProxiesApi(): Promise<string[]> {
    const url = `https://api.proxyscrape.com/v2/account/datacenter_shared/proxy-list`
    const params = {
      auth: this.apiKey,
      type: 'getproxies',
      protocol: 'socks',
      format: 'normal',
      status: 'all',
    }
    const res = await axios.get(url, { params }).then((res) => {
      const data = res.data
      return data.split('\n').map((el: string) => el.trim())
    })
    return res
  }
}
