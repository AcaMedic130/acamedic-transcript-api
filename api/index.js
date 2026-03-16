export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: "Falta el ID del video"
    });
  }

  try {

    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=es`;

    const response = await fetch(url);

    const xml = await response.text();

    if (!xml) {
      return res.status(404).json({
        success: false,
        error: "El video no tiene subtítulos en este idioma"
      });
    }

    // extraer texto del XML
    const matches = [...xml.matchAll(/<text start="([^"]+)" dur="([^"]+)">([^<]+)<\/text>/g)];

    const transcript = matches.map(m => ({
      start: parseFloat(m[1]),
      text: m[3]
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
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
