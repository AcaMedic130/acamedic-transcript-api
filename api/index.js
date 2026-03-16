export default async function handler(req, res) {

  try {

    const videoId = req.query.v;

    if (!videoId) {
      return res.status(400).json({
        error: "missing video id"
      });
    }

    // STEP 1 — PLAYER API (ANDROID CLIENT)

    const playerRes = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "com.google.android.youtube/17.31.35 (Linux; U; Android 11)"
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "17.31.35",
              androidSdkVersion: 30
            }
          },
          videoId: videoId
        })
      }
    );

    const playerJson = await playerRes.json();

    if (!playerJson.captions) {
      return res.json({
        step: "captions",
        error: "video has no captions",
        playability: playerJson.playabilityStatus
      });
    }

    const tracks =
      playerJson.captions
        .playerCaptionsTracklistRenderer
        .captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.json({
        step: "tracks",
        error: "no caption tracks"
      });
    }

    // escoger español si existe
    let track =
      tracks.find(t => t.languageCode === "es") ||
      tracks[0];

    const timedtextUrl = track.baseUrl + "&fmt=json3";

    // STEP 2 — DOWNLOAD SUBTITLES

    const subsRes = await fetch(timedtextUrl, {
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    });

    const subsJson = await subsRes.json();

    if (!subsJson.events) {
      return res.json({
        step: "events",
        error: "subtitle json invalid",
        debug: subsJson
      });
    }

    // STEP 3 — PARSE TEXT

    const transcript = subsJson.events
      .filter(e => e.segs)
      .map(e => e.segs.map(s => s.utf8).join(""))
      .join(" ");

    res.json({
      success: true,
      videoId,
      language: track.languageCode,
      transcript
    });

  } catch (err) {

    res.status(500).json({
      step: "catch",
      error: err.message
    });

  }

}
