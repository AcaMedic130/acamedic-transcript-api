export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: "Falta el ID del video"
    });
  }

  try {

    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=es&fmt=json3`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("No se pudieron obtener los subtítulos");
    }

    const data = await response.json();

    if (!data.events) {
      return res.status(404).json({
        success: false,
        error: "El video no tiene subtítulos disponibles"
      });
    }

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
