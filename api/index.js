export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const videoId = req.query.v;
  if (!videoId) return res.status(400).json({ success: false, error: 'Falta el ID del video.' });

  try {
    // 1. Petición simulando un navegador real con cookies de sesión mínima
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.es+FX+478'
      }
    });

    const html = await response.text();

    // 2. Extraer el JSON de configuración donde YouTube guarda las pistas de subtítulos
    const regex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(regex);

    if (!match) {
      // Intento alternativo buscando en la variable global de YouTube
      const altRegex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
      const altMatch = html.match(altRegex);
      
      if (altMatch) {
        const playerResponse = JSON.parse(altMatch[1]);
        const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (tracks) return processTracks(tracks, res);
      }
      
      throw new Error("Este video no tiene subtítulos habilitados o YouTube bloqueó la lectura.");
    }

    const tracks = JSON.parse(match[1]);
    return processTracks(tracks, res);

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Función auxiliar para procesar y limpiar los datos
async function processTracks(tracks, res) {
  // Prioridad: 1. Español, 2. Inglés, 3. Primera disponible
  const selectedTrack = tracks.find(t => t.languageCode === 'es') || 
                        tracks.find(t => t.languageCode === 'en') || 
                        tracks[0];

  const transcriptResponse = await fetch(selectedTrack.baseUrl + "&fmt=json3");
  const data = await transcriptResponse.json();

  const formattedData = data.events
    .filter(event => event.segs)
    .map(event => ({
      start: event.tStartMs / 1000,
      text: event.segs.map(s => s.utf8).join('').trim()
    }))
    .filter(item => item.text !== '');

  const fullText = formattedData.map(d => d.text).join(' ');

  res.status(200).json({
    success: true,
    data: formattedData,
    fullText
  });
}
