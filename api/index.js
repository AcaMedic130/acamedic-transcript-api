export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ error: "Missing video id" });
  }

  try {

    // 1️⃣ descargar HTML del video
    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    }).then(r => r.text());

    // 2️⃣ buscar directamente el URL de timedtext
    const match = html.match(/https:\/\/www\.youtube\.com\/api\/timedtext[^\"]+/);

    if (!match) {
      return res.status(404).json({ error: "Timedtext URL not found" });
    }

    let timedtextUrl = match[0];

    // asegurar formato JSON
    if (!timedtextUrl.includes("fmt=json3")) {
      timedtextUrl += "&fmt=json3";
    }

    // 3️⃣ descargar subtítulos
    const data = await fetch(timedtextUrl).then(r => r.json());

    const transcript = data.events
      .filter(e => e.segs)
      .map(e => ({
        start: e.tStartMs / 1000,
        text: e.segs.map(s => s.utf8).join("")
      }));

    const fullText = transcript.map(t => t.text).join(" ");

    res.status(200).json({
      success: true,
      transcript,
      fullText,
      url: timedtextUrl
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
