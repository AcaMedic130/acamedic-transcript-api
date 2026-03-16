export default async function handler(req, res) {

  try {

    const videoId = req.query.v;

    if (!videoId) {
      return res.status(400).json({ error: "Missing video id" });
    }

    const clients = [
      {
        clientName: "ANDROID",
        clientVersion: "17.31.35",
        userAgent: "com.google.android.youtube/17.31.35 (Linux; Android 11)"
      },
      {
        clientName: "WEB",
        clientVersion: "2.20240101.00.00",
        userAgent: "Mozilla/5.0"
      },
      {
        clientName: "TVHTML5",
        clientVersion: "7.20240101.00.00",
        userAgent: "Mozilla/5.0"
      }
    ];

    let tracks = null;
    let debug = [];

    for (const client of clients) {

      const r = await fetch(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": client.userAgent
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: client.clientName,
                clientVersion: client.clientVersion
              }
            },
            videoId
          })
        }
      );

      const j = await r.json();

      debug.push({
        client: client.clientName,
        playability: j.playabilityStatus?.status
      });

      if (
        j.captions &&
        j.captions.playerCaptionsTracklistRenderer &&
        j.captions.playerCaptionsTracklistRenderer.captionTracks
      ) {

        tracks =
          j.captions.playerCaptionsTracklistRenderer.captionTracks;

        break;
      }

    }

    if (!tracks) {
      return res.json({
        step: "no_captions_found",
        debug
      });
    }

    const track =
      tracks.find(t => t.languageCode === "es") ||
      tracks[0];

    const subtitleUrl = track.baseUrl + "&fmt=json3";

    const subs = await fetch(subtitleUrl, {
      headers: { "user-agent": "Mozilla/5.0" }
    });

    const json = await subs.json();

    const transcript = json.events
      .filter(e => e.segs)
      .map(e => e.segs.map(s => s.utf8).join(""))
      .join(" ");

    res.json({
      success: true,
      language: track.languageCode,
      transcript
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

}
