let cachedToken = null;
let cachedTokenExp = 0;

async function getAccessToken() {
  const now = Date.now();

  if (cachedToken && now < cachedTokenExp) {
    return cachedToken;
  }

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExp = Date.now() + data.expires_in * 1000 - 60000;

  return cachedToken;
}

export default async function handler(req, res) {
  if (req.headers["x-proxy-key"] !== process.env.INTERNAL_PROXY_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = await getAccessToken();

    const response = await fetch(process.env.REALTYNA_LISTINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(req.query)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "Realtyna listings request failed",
        details: text
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Internal proxy error",
      message: error.message
    });
  }
}
