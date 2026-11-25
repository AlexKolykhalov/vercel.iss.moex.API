// @ts-check

export default async function handler(req, res) {
  const isin = "RU000A107TT9";
  
  const type    = isin.substring(0, 2) === "RU" ? "TQCB" : "TQOB";
  const url1    = `https://iss.moex.com/iss/engines/stock/markets/bonds/boards/${type}/securities.json`;
  const sec     = `securities=${isin}`;
  const columns = "securities.columns=SHORTNAME,PREVPRICE,COUPONPERIOD,ACCRUEDINT";

  const response = await fetch(`${url1}?iss.meta=off&iss.only=securities&${sec}&${columns}`);
  if (!response.ok) return res.status(500).json({ error: "iss.moex fetching error" });
  
  const data = await response.json();
  
  res.status(200).json({ text: data });
}

