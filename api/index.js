export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ error: "Missing video id" });
  }

  try {

    // 1️⃣ obtener HTML del video
    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    }).then(r => r.text());

    // 2️⃣ extraer ytInitialPlayerResponse
    const json = html.split("ytInitialPlayerResponse = ")[1].split(";</script>")[0];

    const player = JSON.parse(json);

    const tracks =
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "No subtitles available" });
    }

    // 3️⃣ obtener URL real de subtítulos
    let baseUrl = tracks[0].baseUrl;

    // asegurar formato json3
    if (!baseUrl.includes("fmt=")) {
      baseUrl += "&fmt=json3";
    } else {
      baseUrl = baseUrl.replace("fmt=srv3", "fmt=json3");
    }

    // 4️⃣ descargar subtítulos
    const data = await fetch(baseUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    }).then(r => r.json());

    // 5️⃣ convertir eventos a texto
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

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

}
