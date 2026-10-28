// Quote abstraction: converts fiat (MXN) into the on-chain token amount.

export interface Quote {
  assetCode: string;
  amountToken: number;
  rate: number; // fiat per 1 token
  provider: string;
}

export interface QuoteProvider {
  quote(input: { amountFiat: number; currencyFiat: string; assetCode: string }): Promise<Quote>;
}

/**
 * Stub with fixed, configurable rates (env QUOTE_RATE_<ASSET>_MXN overrides).
 * TODO(etherfuse): replace with an EtherfuseQuoteProvider (MXNe/USDC on Stellar)
 * once we have the sandbox API key. Keep this interface so callers don't change.
 */
export class FixedRateQuoteProvider implements QuoteProvider {
  constructor(private rates: Record<string, number>) {}
  async quote({ amountFiat, assetCode }: { amountFiat: number; currencyFiat: string; assetCode: string }) {
    const rate = this.rates[assetCode];
    if (!rate) throw new Error(`No hay cotización para ${assetCode}`);
    return { assetCode, rate, amountToken: Math.round((amountFiat / rate) * 1e7) / 1e7, provider: "fixed-rate-stub" };
  }
}

export function getQuoteProvider(): QuoteProvider {
  return new FixedRateQuoteProvider({
    XLM: Number(process.env["QUOTE_RATE_XLM_MXN"] ?? 6),
    USDC: Number(process.env["QUOTE_RATE_USDC_MXN"] ?? 18),
  });
}
