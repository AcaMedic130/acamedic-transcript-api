export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ error: "Missing video id" });
  }

  try {

    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`)
      .then(r => r.text());

    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);

    if (!playerResponseMatch) {
      return res.status(404).json({ error: "No player response found" });
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);

    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "No subtitles available" });
    }

    const baseUrl = tracks[0].baseUrl;

    const transcriptData = await fetch(baseUrl + "&fmt=json3")
      .then(r => r.json());

    const transcript = transcriptData.events
      .filter(e => e.segs)
      .map(e => ({
        start: e.tStartMs / 1000,
        text: e.segs.map(s => s.utf8).join("")
      }));

    const fullText = transcript.map(t => t.text).join(" ");

    res.status(200).json({
      success: true,
      transcript,
      fullText
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

}
