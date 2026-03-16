export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ error: "Falta el videoId" });
  }

  try {

    // 1️⃣ obtener lista de idiomas
    const listUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`;

    const listRes = await fetch(listUrl);
    const listXml = await listRes.text();

    const langMatch = listXml.match(/lang_code="([^"]+)"/);

    if (!langMatch) {
      return res.status(404).json({
        success:false,
        error:"El video no tiene subtítulos"
      });
    }

    const lang = langMatch[1];

    // 2️⃣ obtener subtítulos
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;

    const response = await fetch(url);
    const xml = await response.text();

    const matches = [...xml.matchAll(/<text start="([^"]+)" dur="([^"]+)">([^<]+)<\/text>/g)];

    const transcript = matches.map(m => ({
      start: parseFloat(m[1]),
      text: decodeURIComponent(m[3])
    }));

    const fullText = transcript.map(t => t.text).join(" ");

    res.status(200).json({
      success:true,
      lang,
      transcript,
      fullText
    });

  } catch (error) {

    res.status(500).json({
      success:false,
      error:error.message
    });

  }

}
