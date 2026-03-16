export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ error: "Falta el ID del video" });
  }

  try {

    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=es&fmt=json3`;

    const response = await fetch(url);
    const data = await response.json();

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
      success: false,
      error: error.message
    });

  }

}
