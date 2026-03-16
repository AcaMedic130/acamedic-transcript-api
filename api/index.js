export default async function handler(req, res) {
  // Configuración de CORS para permitir que tu frontend en Blogspot se comunique
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
    // 1. Obtenemos el HTML de la página del video simulando ser un navegador
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9'
        }
    });
    const html = await response.text();

    // 2. Extraemos el array de subtítulos oculto en el código de YouTube
    const captionRegex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(captionRegex);

    if (!match || !match[1]) {
      throw new Error('Este video no tiene subtítulos disponibles.');
    }

    const captionTracks = JSON.parse(match[1]);

    // 3. Buscamos subtítulos en Español ('es'), si no hay, tomamos el por defecto
    let track = captionTracks.find(t => t.languageCode.startsWith('es'));
    if (!track) {
        track = captionTracks[0]; 
    }

    // 4. Descargamos el archivo XML con los tiempos y textos de YouTube
    const transcriptResponse = await fetch(track.baseUrl);
    const transcriptXml = await transcriptResponse.text();

    // 5. Parseamos el XML usando una expresión regular
    const regex = /<text\s+start="([\d.]+)"[^>]*>(.*?)<\/text>/g;
    let result;
    const formattedData = [];
    const textParts = [];

    // Función auxiliar para decodificar entidades HTML (ej. &quot; -> ")
    const decodeEntities = (text) => {
        return text.replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'")
                   .replace(/&nbsp;/g, ' ');
    };

    while ((result = regex.exec(transcriptXml)) !== null) {
        const start = parseFloat(result[1]);
        let text = result[2];

        // Limpiamos etiquetas internas HTML (como <font>) y decodificamos texto
        text = text.replace(/<[^>]+>/g, '');
        text = decodeEntities(text);

        formattedData.push({
            start: start,
            text: text
        });
        textParts.push(text);
    }

    // Unimos todo el texto para enviárselo a tu IA (Gemini/OpenRouter)
    const fullText = textParts.join(' ');

    // 6. Enviamos la respuesta exactamente como el frontend de AcaMedic la espera
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
