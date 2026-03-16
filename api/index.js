export default async function handler(req, res) {

  try {

    const videoId = req.query.v;

    if (!videoId) {
      return res.status(400).json({
        step: "validate",
        error: "Missing video id"
      });
    }

    // STEP 1: obtener info del player
    const playerResponse = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0"
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

    const playerJson = await playerResponse.json();

    if (!playerJson.captions) {
      return res.json({
        step: "captions-check",
        error: "Video has no captions",
        debug: playerJson
      });
    }

    const tracks =
      playerJson.captions
        .playerCaptionsTracklistRenderer
        .captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.json({
        step: "tracks-check",
        error: "No caption tracks"
      });
    }

    const baseUrl = tracks[0].baseUrl + "&fmt=json3";

    // STEP 2: descargar subtítulos
    const subtitleResponse = await fetch(baseUrl, {
      headers: { "user-agent": "Mozilla/5.0" }
    });

    const subtitleJson = await subtitleResponse.json();

    if (!subtitleJson.events) {
      return res.json({
        step: "subtitle-json",
        error: "events not found",
        debug: subtitleJson
      });
    }

    const transcript = subtitleJson.events
      .filter(e => e.segs)
      .map(e => e.segs.map(s => s.utf8).join(""))
      .join(" ");

    res.json({
      success: true,
      videoId,
      transcript
    });

  } catch (err) {

    res.json({
      step: "catch",
      error: err.message,
      stack: err.stack
    });

  }

}
