import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  // 1. Configuramos los encabezados CORS para permitir peticiones desde tu frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  // Si es una petición de pre-vuelo (CORS), respondemos OK
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. Obtenemos el ID del video de la URL
  const videoId = req.query.v;
  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Falta el ID del video.' });
  }

  try {
    // 3. Obtenemos los subtítulos usando la librería. 
    // Intentamos en español ('es') primero, y si falla, obtenemos el idioma por defecto.
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' })
      .catch(() => YoutubeTranscript.fetchTranscript(videoId));

    // 4. Formateamos los datos para mantener la misma estructura que tenías antes
    const formattedData = transcript.map(item => ({
      // La librería suele devolver el offset en milisegundos. Lo dividimos entre 1000 para tener segundos.
      // (Si notas que los tiempos van muy lento en tu frontend, quita el "/ 1000")
      start: item.offset / 1000, 
      text: item.text.trim()
    }));

    // 5. Enviamos la respuesta exitosa
    return res.status(200).json({ success: true, data: formattedData });

  } catch (error) {
    // 6. Si algo sale mal (ej. el video realmente no tiene subtítulos), devolvemos error
    return res.status(500).json({ 
      success: false, 
      error: "Este video no tiene subtítulos habilitados o YouTube bloqueó la lectura.",
      details: error.message
    });
  }
}
