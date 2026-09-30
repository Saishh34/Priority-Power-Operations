const fetch = global.fetch;
async function test() {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const url = `https://api.airtable.com/v0/${BASE_ID}/Jobs`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
  const data = await res.json();
  console.log(JSON.stringify(data.records, null, 2));
}
test();
