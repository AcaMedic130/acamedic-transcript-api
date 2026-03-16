export default async function handler(req, res) {

  try {

    const videoId = req.query.v;

    if (!videoId) {
      return res.status(400).json({
        error: "Missing video id"
      });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const r = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const html = await r.text();

    // extraer ytInitialPlayerResponse
    const match = html.match(
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});/
    );

    if (!match) {
      return res.json({
        step: "extract_player_response_failed"
      });
    }

    const player = JSON.parse(match[1]);

    const tracks =
      player.captions
        ?.playerCaptionsTracklistRenderer
        ?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.json({
        step: "no_caption_tracks"
      });
    }

    const track =
      tracks.find(t => t.languageCode === "es") ||
      tracks[0];

    const subtitleUrl = track.baseUrl + "&fmt=json3";

    const subs = await fetch(subtitleUrl);

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
