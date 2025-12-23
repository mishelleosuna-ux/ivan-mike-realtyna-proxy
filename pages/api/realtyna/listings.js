let cachedToken = null;
let cachedTokenExp = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExp) return cachedToken;

  const form = new URLSearchParams();
  form.append("client_id", process.env.REALTYNA_CLIENT_ID);
  form.append("client_secret", process.env.REALTYNA_CLIENT_SECRET);

  const res = await fetch(process.env.REALTYNA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: form.toString()
  });

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExp = Date.now() + (data.expires_in * 1000) - 60000;
  return cachedToken;
}

export default async function handler(req, res) {
  if (req.headers["x-proxy-key"] !== process.env.INTERNAL_PROXY_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = await getAccessToken();
  const params = new URLSearchParams(req.query).toString();

  const response = await fetch(
    `${process.env.REALTYNA_LISTINGS_URL}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
