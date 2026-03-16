import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  // 1. Configurar CORS para permitir que tu Blogger se conecte sin bloqueos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Obtener el ID del video de la URL (?v=ID)
  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Falta el ID del video.' });
  }

  try {
    // 3. Extraer los subtítulos (intenta primero en español)
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' });

    // 4. Formatear los datos EXACTAMENTE como los necesita tu código de Blogger
    const formattedData = transcript.map(t => ({
      start: t.offset / 1000, // Convierte milisegundos a segundos
      text: t.text
    }));

    const fullText = transcript.map(t => t.text).join(' ');

    // 5. Enviar la respuesta exitosa
    res.status(200).json({
      success: true,
      data: formattedData,
      fullText: fullText
    });

  } catch (error) {
    console.error("Error al obtener subtítulos:", error.message);
    res.status(500).json({ 
      success: false, 
      error: "El video no tiene subtítulos habilitados o están bloqueados." 
    });
  }
}
