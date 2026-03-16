export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ error: "Missing video id" });
  }

  try {

    // 1️⃣ descargar HTML del video
    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    }).then(r => r.text());

    // 2️⃣ extraer ytInitialPlayerResponse
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\})\s*;/s);

    if (!match) {
      return res.status(500).json({ error: "Player response not found" });
    }

    const playerResponse = JSON.parse(match[1]);

    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "No subtitles available" });
    }

    // 3️⃣ obtener URL real del transcript
    const baseUrl = tracks[0].baseUrl + "&fmt=json3";

    const data = await fetch(baseUrl).then(r => r.json());

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
      fullText
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
