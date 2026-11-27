// @ts-check

import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Разрешен только POST" });
  }

  path.join(process.cwd(), "moex-ca.pem");

  const range = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const isinsTQCB = range.filter(row => row[0].substring(0, 2) === "RU").map(row => row[0]).join(",");
  const isinsTQOB = range.filter(row => row[0].substring(0, 2) !== "RU").map(row => row[0]).join(",");

  const url1    = `https://iss.moex.com/iss/engines/stock/markets/bonds/boards/TQCB/securities.json`;
  const sec1    = `securities=${isinsTQCB}`;
  const url2    = `https://iss.moex.com/iss/engines/stock/markets/bonds/boards/TQOB/securities.json`;
  const sec2    = `securities=${isinsTQOB}`;
  const columns = "securities.columns=SECID,SHORTNAME,PREVPRICE,COUPONPERIOD,ACCRUEDINT";

  try {
    const responses = await Promise.all([
      fetch(`${url1}?iss.meta=off&iss.only=securities&${sec1}&${columns}`),
      fetch(`${url2}?iss.meta=off&iss.only=securities&${sec2}&${columns}`),
    ]);

    if (!responses[0].ok || !responses[1].ok) {
      console.log("One or more responses failed");
      return;
    }

    const [dataTQCB, dataTQOB] = await Promise.all(responses.map(response => response.json()));
    const securities = [...dataTQCB.securities.data, ...dataTQOB.securities.data];

    const fetches = range.map(row => {
      const isin = row[0];
      const date = row[1];

      const url3      = `https://iss.moex.com/iss/securities/${isin}/bondization.json`;
      const p_amo     = "amortizations.columns=amortdate,secid,value_rub";
      const p_offers  = "offers.columns=offerdate,secid,price";
      const p_coupons = `coupons.columns=coupondate,secid,valueprc,value&coupons.limit=100&coupons.from=${date}`;

      return fetch(`${url3}?iss.meta=off&${p_amo}&${p_offers}&${p_coupons}`);
    });

    const responses1 = await Promise.all(fetches);
    for (let i = 0; i < responses1.length; i++) {
      if (!responses1[i].ok) {
	console.log("One or more responses failed");
	break;
      }
    }

    const bondization = await Promise.all(responses1.map(response => response.json()));

    const amo     = bondization.flatMap(item => item.amortizations.data);
    const offers  = bondization.flatMap(item => item.offers.data);
    const coupons = bondization.flatMap(item => item.coupons.data);

    res.status(200).json({
      securities: securities,
      amo: amo,
      offers: offers,
      coupons: coupons
    });
  } catch (_) {
    return res.status(500).end();
  }
}
