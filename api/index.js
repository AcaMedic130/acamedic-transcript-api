import YoutubeTranscript from 'youtube-transcript';

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Falta el ID del video.' });
  }

  try {

    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' });

    const formattedData = transcript.map(t => ({
      start: t.offset / 1000,
      text: t.text
    }));

    const fullText = transcript.map(t => t.text).join(' ');

    res.status(200).json({
      success: true,
      data: formattedData,
      fullText
    });

  } catch (error) {

    console.error("Error al obtener subtítulos:", error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
}
