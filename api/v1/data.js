// @ts-check

import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Разрешен только POST" });
  }
  
  path.join(process.cwd(), "moex-ca.pem");

  const range = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const securities = [];
  const amo        = [];
  const offers     = [];
  const coupons    = [];
  const result     = [];

  // console.log(range.slice(0, 10));

  for (let i = 0; i < range.slice(0, 10).length; i++) {
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

      if (!responses[0].ok || !responses[1].ok) {
	return res.status(500).json({ error: "One or more responses failed" });
      }

      const [dataSec, dataBon] = await Promise.all(responses.map(response => response.json()));

      dataSec.securities.data.forEach(row => {
	const shortname = row[0];
	const price     = Number(row[1]);
	const period    = Number(row[2]);
	const aci       = Number(row[3]);

	securities.push([
	  isin,
	  shortname,
	  !isNaN(price)  ? price  : 0,
	  !isNaN(period) ? period : 0,
	  !isNaN(aci)    ? aci    : 0
	]);
      });

      dataBon.amortizations.data.forEach(row => {
	const parts = row[0].split("-").map(Number);
	const date  = new Date(parts[0], parts[1] - 1, parts[2]);
	const value = Number(row[1]);
	amo.push([date, isin, !isNaN(value) ? value : 0]);
      });
      dataBon.offers.data.forEach(row => {
	const parts = row[0].split("-").map(Number);
	const date  = new Date(parts[0], parts[1] - 1, parts[2]);
	const value = Number(row[1]);
	offers.push([date, isin, !isNaN(value) ? value / 100 : 0]);
      });
      dataBon.coupons.data.forEach(row => {
	const parts = row[0].split("-").map(Number);
	const date  = new Date(parts[0], parts[1] - 1, parts[2]);
	const prc   = Number(row[1]);
	const value = Number(row[2]);
	coupons.push([date, isin, !isNaN(prc) ? prc : 0, !isNaN(value) ? value : 0]);
      });
    } catch (error) {
      return res.status(500).json({ error: error });
    }
  }

  securities.sort((a, b) => a[1].localeCompare(b[1]));
  amo.sort((a, b) => a[0].getTime() - b[0].getTime());
  offers.sort((a, b) => a[0].getTime() - b[0].getTime());
  coupons.sort((a, b) => a[0].getTime() - b[0].getTime());

  for (let i = 0; i < coupons.length; i++) {
    result.push([
      coupons[i][0].getTime(), coupons[i][1], coupons[i][2], coupons[i][3], "",
      amo[i] ? amo[i][0].toLocaleDateString("en-US") : "", amo[i] ? amo[i][1] : "", amo[i] ? amo[i][2] : "", "",
      offers[i] ? offers[i][0].toLocaleDateString("en-US") : "", offers[i] ? offers[i][1] : "", offers[i] ? offers[i][2] : "", "",
      securities[i] ? securities[i][0] : "", securities[i] ? securities[i][1] : "", securities[i] ? securities[i][2] : "", securities[i] ? securities[i][3] : "", securities[i] ? securities[i][4] : ""
    ]);
  }
  
  return res.status(200).json({ data: result });
}
