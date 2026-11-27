// @ts-check

import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Разрешен только POST" });
  }

  path.join(process.cwd(), "moex-ca.pem");

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const inns = body.inns; // ["", "", ...]
  const from = body.from; // YYYY-MM-DD
  const till = body.till; // YYYY-MM-DD

  // Bondization
  const p_amo     = "amortizations.columns=amortdate,secid,name,valueprc,issuevalue&amortizations.limit=100";
  const p_offers  = "offers.columns=offerdate,secid,name,price,issuevalue";
  const p_coupons = "coupons.columns=coupondate,secid,name,value,issuevalue&coupons.limit=100";
  const p_from    = `from=${from}`;
  const p_till    = `till=${till}`;

  try {
    const fetchesSECID = inns.map(inn => {
      const url = `https://iss.moex.com/iss/apps/infogrid/emission/rates.json`;

      return fetch(`${url}?iss.meta=off&&iss.only=rates&rates.columns=SECID&q=${inn}`);
    });
    const responses1 = await Promise.all(fetchesSECID);
    for (let i = 0; i < responses1.length; i++) {
      if (!responses1[i].ok) {
	return res.status(500).json({ msg: "One or more SECID responses failed" });
      }
    }
    const secidData   = await Promise.all(responses1.map(response => response.json()));
    const secids      = secidData.flatMap(item => item.rates.data).flat();

    const fetchesBond = secids.map(secid => {
      const url = `https://iss.moex.com/iss/securities/${secid}/bondization.json`;

      return fetch(`${url}?iss.meta=off&${p_amo}&${p_offers}&${p_coupons}&${p_from}&${p_till}`);
    });
    const responses2 = await Promise.all(fetchesBond);
    for (let i = 0; i < responses2.length; i++) {
      if (!responses2[i].ok) {
	return res.status(500).json({ msg: "One or more Bond responses failed" });
      }
    }

    const secidBond = await Promise.all(responses2.map(response => response.json()));
    const amo       = secidBond.flatMap(item => item.amortizations.data);
    const offers    = secidBond.flatMap(item => item.offers.data);
    const coupons   = secidBond.flatMap(item => item.coupons.data);

    res.status(200).json({
      amo: amo,
      offers: offers,
      coupons: coupons
    });
  } catch(_) {
    return res.status(500).end();
  }
}
