// @ts-check

export default function handler(req, res) {


  // const isin = range[i][0];
  // const date = range[i][1];

  const isin = "RU000A107TT9";
  // const date = "2025-12-12";
  
  const type = isin.substring(0, 2) === "RU" ? "TQCB" : "TQOB";

  const url1    = `https://iss.moex.com/iss/engines/stock/markets/bonds/boards/${type}/securities.json`;
  const sec     = `securities=${isin}`;
  const columns = "securities.columns=SHORTNAME,PREVPRICE,COUPONPERIOD,ACCRUEDINT";

  // const url2 = `https://iss.moex.com/iss/securities/${isin}/bondization.xml`;
  // const p_amo = "amortizations.columns=amortdate,value_rub";
  // const p_coupons = `coupons.columns=coupondate,valueprc,value&coupons.limit=100&coupons.from=${date}`;
  // const p_offers = "offers.columns=offerdate,price";

  const response1 = UrlFetchApp
        .fetch(`${url1}?iss.meta=off&iss.only=securities&${sec}&${columns}`)
        .getContentText();

  
  res.status(200).json({ text: response1 });
}

