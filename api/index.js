// 1. Importamos la herramienta nativa de Node.js para forzar la compatibilidad
import { createRequire } from 'module';

// 2. Creamos la función 'require' para este archivo
const require = createRequire(import.meta.url);

// 3. Importamos la librería usando el método clásico (CommonJS)
import YoutubeTranscript from 'youtube-transcript';

export default async function handler(req, res) {
  // Configurar CORS para permitir que tu página web se conecte sin bloqueos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Obtener el ID del video de la URL (ej: ?v=D5xB4reISfI)
  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Falta el ID del video.' });
  }

  try {
    // Extraer los subtítulos en español ('es')
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' });

    // Formatear los datos para que sean fáciles de usar en tu HTML
    const formattedData = transcript.map(t => ({
      start: t.offset / 1000,
      text: t.text
    }));

    const fullText = transcript.map(t => t.text).join(' ');

    // Enviar respuesta exitosa
    res.status(200).json({
      success: true,
      data: formattedData,
      fullText: fullText
    });

  } catch (error) {
    console.error("Error al obtener subtítulos:", error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message || "No se pudieron obtener los subtítulos. Verifica que el video los tenga habilitados." 
    });
  }
}
