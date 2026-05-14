# Otto's Rocket Car Train Adventure

A tiny browser game for Otto about moon cars, rockets, moon trains, moon tunnels, space bats, moon race cars, a colorful toy garage ramp on the moon with gentle burst-out zoomies, moon food, moon birthdays, a gentle moon crane, a friendly robot helper, a friendly moon tow truck, dance parties, and one quick trip back to Earth to collect passengers.

## Run it

```sh
python3 -m http.server 8123
```

Then open `http://localhost:8123`.

## Controls

Use the large story buttons to make the game easier to steer:

- **Back** and **Next** move through the story scenes.
- **Pause/Play** stops or resumes the story timer and narration.
- **Speed** cycles through Slow, Cozy, and Zoom pacing.

Use the big vehicle buttons for toddler-friendly action:

- **Zoom!** makes the cars stretch forward with speed lines.
- **Jump!** makes the cars bounce extra high.
- **Twirl!** spins the vehicles.
- **Rocket!** makes rocket flames bigger and wigglier.
- **Train!** adds chugging motion, steam, and speed sparks.
- **Crane!** wiggles the moon crane as it gently lifts cars, rockets, or passenger pods with a soft sling.
- **Tow!** pulls out the friendly moon tow truck with a gentle lift and a happy honk vibe.
- **Party!** starts the confetti adventure burst.

Keyboard helpers: Space jumps, `g` or Right Arrow goes to the next scene, Left Arrow goes back, `p` pauses, `z` zooms, `t` twirls, `r` rockets, `c` chugs the train, `l` lifts with the crane, and `w` calls the tow truck.

Turn on **Narration** to hear each story scene aloud. When narration is on, vehicle actions also say short kid-friendly phrases, and automatic scene changes wait until the current line finishes (recorded audio or speech). With narration off, scenes still advance on the story timer as before.

## Recorded narration

The game looks for recorded narration in `audio/narration/manifest.json`. If those files are present, it plays them first. If they are missing or cannot be played, it falls back to browser `SpeechSynthesis`.

To generate ElevenLabs narration locally:

```sh
ELEVENLABS_API_KEY=your-key-here node scripts/generate-narration.mjs
```

Optional settings:

```sh
ELEVENLABS_VOICE_ID=voice-id ELEVENLABS_MODEL_ID=eleven_multilingual_v2 node scripts/generate-narration.mjs --force
```

Do not put API keys in this repo. Keep them in your shell environment or a local secret manager.

If you reorder, add, or remove story scenes, run with `--force` so every `scene-*.mp3` stays matched to the scene list (filenames are positional).
