import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  // 1. Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Obtener el ID del video
  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Falta el ID del video.' });
  }

  try {
    // 3. Extraer los subtítulos
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' });

    // 4. Formatear los datos
    const formattedData = transcript.map(t => ({
      start: t.offset / 1000,
      text: t.text
    }));

    const fullText = transcript.map(t => t.text).join(' ');

    // 5. Enviar respuesta exitosa
    res.status(200).json({
      success: true,
      data: formattedData,
      fullText: fullText
    });

  } catch (error) {
    console.error("Error al obtener subtítulos:", error.message);
    // IMPORTANTE: Devolvemos el mensaje de error real para saber qué falló
    res.status(500).json({ 
      success: false, 
      error: error.message || "El video no tiene subtítulos habilitados." 
    });
  }
}
