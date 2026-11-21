// Netlify serverless function: creates a lead on the Monday.com "Elite Leads" board
// Requires MONDAY_API_KEY environment variable set in Netlify dashboard

const BOARD_ID = "18408486109";

const INTEREST_MAP = {
  buying: "Buying a Home",
  selling: "Selling a Property",
  investing: "Investment Properties",
  "market-analysis": "Free Market Analysis",
  "property-management": "Property Management",
  careers: "Other",
  other: "Other",
};

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) {
    console.error("MONDAY_API_KEY is not set in Netlify environment variables");
    return { statusCode: 500, body: JSON.stringify({ error: "Monday API key not configured", code: "no_api_key" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const firstName = (body["first-name"] || "").trim();
  const lastName = (body["last-name"] || "").trim();
  const email = (body.email || "").trim();
  const phoneRaw = (body.phone || "").trim();
  let phone = phoneRaw.replace(/[^0-9]/g, "");
  if (phone.length === 11 && phone.charAt(0) === "1") phone = phone.slice(1);
  const interest = body.interest || "";
  let message = (body.message || "").trim();
  if (body.area) {
    message = "[Area page: " + String(body.area).trim().slice(0, 60) + "]" + (message ? "\n" + message : "");
  }
  if (body["property-address"]) {
    message = "[Home value request] Property: " + String(body["property-address"]).trim().slice(0, 200) + (message ? "\n" + message : "");
  }
  if (interest === "careers") {
    const extra = [];
    if (body["license-status"]) extra.push("Status: " + String(body["license-status"]).trim());
    if (body["profile-taken"]) extra.push("Took RightSeat profile: " + String(body["profile-taken"]).trim());
    message = "[CAREERS / AGENT RECRUITING]\n" + extra.join("\n") + (message ? "\n\n" + message : "");
  }

  // Spam trap: real visitors never see or fill the hidden "bot-field" input
  if (body["bot-field"]) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  if (!firstName || !lastName || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: "First name, last name, and email are required" }) };
  }

  const itemName = firstName + " " + lastName;
  const interestLabel = INTEREST_MAP[interest] || "";

  const columnValues = {
    email_mm2c6n4m: { email: email, text: email },
    long_text_mm2ck2jk: { text: message },
    color_mm2cegm: { label: "New" },
  };

  if (phone.length >= 10) {
    columnValues.phone_mm2c3yqb = { phone: phone, countryShortName: "US" };
  }
  if (interestLabel) {
    columnValues.color_mm2c79y = { label: interestLabel };
  }

  const mutation = `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
    create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues, create_labels_if_missing: true) {
      id
    }
  }`;

  async function createItem(values) {
    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({
        query: mutation,
        variables: { boardId: BOARD_ID, itemName: itemName, columnValues: JSON.stringify(values) },
      }),
    });
    const text = await res.text();
    let result = {};
    try { result = JSON.parse(text); } catch (e) { result = {}; }
    const errMsg =
      (result.errors && result.errors.length && (result.errors[0].message || JSON.stringify(result.errors[0]))) ||
      result.error_message || result.error_code ||
      (!res.ok ? "HTTP " + res.status : "") ||
      (!result.data || !result.data.create_item ? "No item returned" : "");
    if (errMsg) console.error("Monday API error:", res.status, text.slice(0, 1000));
    return { id: !errMsg && result.data.create_item.id, error: errMsg };
  }

  try {
    // Attempt 1: all columns
    let r = await createItem(columnValues);
    if (r.id) return { statusCode: 200, body: JSON.stringify({ success: true, itemId: r.id }) };

    // Attempt 2: a column value was rejected (label, phone format, etc.) - keep the lead,
    // put phone and interest into the message instead so nothing is lost.
    const fallbackMessage = [
      interestLabel ? "Interested in: " + interestLabel : "",
      phoneRaw ? "Phone: " + phoneRaw : "",
      message,
    ].filter(Boolean).join("\n");
    const minimal = {
      email_mm2c6n4m: { email: email, text: email },
      long_text_mm2ck2jk: { text: fallbackMessage },
    };
    const r2 = await createItem(minimal);
    if (r2.id) return { statusCode: 200, body: JSON.stringify({ success: true, itemId: r2.id, fallback: true }) };

    return { statusCode: 502, body: JSON.stringify({ error: "Failed to create lead", code: "monday", detail: String(r2.error || r.error).slice(0, 160) }) };
  } catch (err) {
    console.error("Monday API request failed:", err);
    return { statusCode: 502, body: JSON.stringify({ error: "Failed to create lead", code: "network", detail: String((err && err.message) || err).slice(0, 160) }) };
  }
};
