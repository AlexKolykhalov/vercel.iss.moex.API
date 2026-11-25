// @ts-check
import path from "path";

export default async function handler(req, res) {
  path.join(process.cwd(), "moex-ca.pem");

  const securities = [];
  const amo        = [];
  const offers     = [];
  const coupons    = [];
  const result     = [];

  const range = [["RU000A107TT9", "2025-12-12"]];

  for (let i = 0; i < range.length; i++) {
    const isin = range[i][0];
    const date = range[i][1];
    const type = isin.substring(0, 2) === "RU" ? "TQCB" : "TQOB";

    const url1    = `https://iss.moex.com/iss/engines/stock/markets/bonds/boards/${type}/securities.json`;
    const sec     = `securities=${isin}`;
    const columns = "securities.columns=SHORTNAME,PREVPRICE,COUPONPERIOD,ACCRUEDINT";

    const url2      = `https://iss.moex.com/iss/securities/${isin}/bondization.json`;
    const p_amo     = "amortizations.columns=amortdate,value_rub";
    const p_coupons = `coupons.columns=coupondate,valueprc,value&coupons.limit=100&coupons.from=${date}`;
    const p_offers  = "offers.columns=offerdate,price";

    try {
      const responses = await Promise.all([
	fetch(`${url1}?iss.meta=off&iss.only=securities&${sec}&${columns}`),
	fetch(`${url2}?iss.meta=off&${p_amo}&${p_offers}&${p_coupons}`)
      ]);

      if (!responses[0].ok || !responses[1].ok)
	return res.status(500).json({ error: "One or more responses failed" });

      const [dataSec, dataBon] = await Promise.all(responses.map(response => response.json()));

      return res.status(200).json({ text: dataSec, text1: dataBon });
    } catch (error) {
      return res.status(500).json({ error: error });
    }
  }
}
