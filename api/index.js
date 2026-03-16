export default async function handler(req, res) {
  // Configuración de CORS
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
    // 1. PETICIÓN ANTI-BLOQUEO A YOUTUBE
    // El 'Cookie: CONSENT...' es vital en Vercel para saltar la pantalla de Aceptar Cookies de Google.
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
            'Cookie': 'CONSENT=YES+cb.20210328-17-p0.es+FX+478'
        }
    });
    
    const html = await response.text();

    // 2. EXTRACCIÓN SÚPER ROBUSTA (Doble Método)
    let captionTracks = [];

    // Método A: Buscar el array JSON directo
    const regexCaptions = /"captionTracks":\s*(\[.*?\])/;
    const matchCaptions = html.match(regexCaptions);
    
    if (matchCaptions && matchCaptions[1]) {
        try {
            captionTracks = JSON.parse(matchCaptions[1]);
        } catch (e) {
            // Falla silenciosa para pasar al Método B
        }
    }

    // Método B: Desempaquetar el objeto completo 'ytInitialPlayerResponse' si el A falla
    if (!captionTracks || captionTracks.length === 0) {
        try {
            let jsonString = html.split('ytInitialPlayerResponse = ')[1];
            if (jsonString) {
                jsonString = jsonString.split('</script>')[0];
                jsonString = jsonString.replace(/;var\s+meta.*/, ''); // Limpiar basura al final
                jsonString = jsonString.replace(/;window.*/, '');
                jsonString = jsonString.trim();
                if (jsonString.endsWith(';')) jsonString = jsonString.slice(0, -1);

                const playerResponse = JSON.parse(jsonString);
                captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
            }
        } catch (e) {
            console.error("Fallo el Método B de extracción");
        }
    }

    // Validación final: ¿Existen subtítulos?
    if (!captionTracks || captionTracks.length === 0) {
         throw new Error('Este video no tiene subtítulos habilitados (ni manuales ni generados automáticamente).');
    }

    // 3. SELECCIÓN INTELIGENTE DEL IDIOMA
    // Buscamos: Español manual -> Español generado (asr) u otras variantes -> El primero por defecto
    let selectedTrack = 
        captionTracks.find(t => t.languageCode === 'es' && !t.kind) || 
        captionTracks.find(t => t.languageCode.includes('es')) || 
        captionTracks[0];

    // 4. DESCARGA DEL XML DE YOUTUBE
    const transcriptResponse = await fetch(selectedTrack.baseUrl);
    const transcriptXml = await transcriptResponse.text();

    // 5. PARSEO DEL XML OFICIAL
    // Captura start, ignora atributos extras y obtiene el texto
    const textRegex = /<text\s+start="([\d.]+)"(?:[^>]*)>(.*?)<\/text>/g;
    
    let result;
    const formattedData = [];
    const textParts = [];

    // Función para decodificar caracteres HTML (ej. &quot; a ")
    const decodeEntities = (text) => {
        return text.replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'")
                   .replace(/&nbsp;/g, ' ');
    };

    while ((result = textRegex.exec(transcriptXml)) !== null) {
        const start = parseFloat(result[1]);
        let text = result[2];

        // Limpiar etiquetas internas (como <font color="...">)
        text = text.replace(/<[^>]+>/g, '');
        text = decodeEntities(text);

        if (text.trim() !== '') {
            formattedData.push({ start, text });
            textParts.push(text);
        }
    }

    const fullText = textParts.join(' ');

    // 6. RESPUESTA PERFECTA AL FRONTEND
    res.status(200).json({
      success: true,
      data: formattedData,
      fullText
    });

  } catch (error) {
    console.error("Error en Vercel:", error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
