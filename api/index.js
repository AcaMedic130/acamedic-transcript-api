export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  const videoId = req.query.v;

  if (!videoId) {
    return res.status(400).json({ error: "Missing video id" });
  }

  try {

    const response = await fetch(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240101.00.00"
            }
          },
          videoId: videoId
        })
      }
    );

    const player = await response.json();

    const tracks =
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "No subtitles available" });
    }

    let url = tracks[0].baseUrl + "&fmt=json3";

    const data = await fetch(url).then(r => r.json());

    const transcript = data.events
      .filter(e => e.segs)
      .map(e => ({
        start: e.tStartMs / 1000,
        text: e.segs.map(s => s.utf8).join("")
      }));

    const fullText = transcript.map(t => t.text).join(" ");

    res.json({
      success: true,
      transcript,
      fullText
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
