import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const scenes = [
  "On the moon, the cars climb onto the rocket ships. Ready, steady...",
  "Moon gravity zoom! The cars jump super high off the rockets!",
  "Down, down, soft moon bounce! The cars land in the moon dust.",
  "Boing! The cars jump onto the moon train.",
  "The moon train goes through a moon tunnel. Space bats flap flap flap!",
  "The train stops at the moon station. Rocket drivers are waiting!",
  "The rocket drivers zoom over the moon craters!",
  "Around the moon they go: twirl, twirl, twirl!",
  "The rocket drivers visit stripey moon domes and bouncy moon hills.",
  "They look everywhere for moon food. Is it behind the moon rocks?",
  "Vroom! The rocket drivers ride moon race cars.",
  "Toy garage pause! Ramp lights blink blink on the sparkly moon playground.",
  "Pop goes the ramp! Toy cars bounce-burst out in a giggly sparkly whoosh!",
  "Moon dance party! Wiggle, bounce, spin!",
  "Yum yum yum. Everybody eats moon food together.",
  "Back to Earth. Passengers hop on for the next adventure.",
  "Back to the moon! They plan their day and do silly twirlies.",
  "Jump down from the rocket... big moon bounce! Safe in the moon dust.",
  "Moon birthday time! Otto's moon cake sparkles with safe candle stars.",
  "The moon crane gently lifts the cars with a soft star sling.",
  "Crane helper moves rockets and passengers to the birthday train. Beep beep!",
  "A friendly moon robot checks the wheels and waves passengers aboard for cake.",
];

const actionPhrases = {
  zoom: ["Zoom zoom!", "Fast car time!", "Vroom vroom!"],
  jump: ["Boing boing!", "Big bouncy jump!", "Up we go!"],
  twirl: ["Spinny twirl!", "Round and round!", "Silly twirlies!"],
  rocket: ["Rocket blast!", "Whoosh to the moon!", "Big rocket fire!"],
  train: ["Chugga chugga!", "All aboard!", "Train goes toot toot!"],
  crane: ["Crane lift!", "Up, up, gentle crane!", "Soft sling delivery!"],
  adventure: ["Adventure time!", "Confetti blast!", "Let's zoom together!"],
};

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const outputDir = process.env.NARRATION_OUTPUT_DIR || "audio/narration";
const defaultVoiceId = "21m00Tcm4TlvDq8ikWAM";
const args = new Set(process.argv.slice(2));
const force = args.has("--force");

if (!apiKey) {
  console.error("Set ELEVENLABS_API_KEY before generating narration.");
  process.exit(1);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const voiceId = await resolveVoiceId();
  const manifest = {
    version: 1,
    provider: "elevenlabs",
    modelId,
    voiceId,
    generatedAt: new Date().toISOString(),
    scenes: [],
    actions: {},
  };

  for (const [index, text] of scenes.entries()) {
    const filename = `scene-${String(index + 1).padStart(2, "0")}.mp3`;
    await generateAudio(text, filename, voiceId);
    manifest.scenes.push(path.posix.join(outputDir, filename));
  }

  for (const [kind, phrases] of Object.entries(actionPhrases)) {
    manifest.actions[kind] = [];
    for (const [index, text] of phrases.entries()) {
      const filename = `action-${kind}-${String(index + 1).padStart(2, "0")}.mp3`;
      await generateAudio(text, filename, voiceId);
      manifest.actions[kind].push(path.posix.join(outputDir, filename));
    }
  }

  await writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`Wrote narration manifest and audio files to ${outputDir}.`);
}

async function resolveVoiceId() {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;

  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) {
    console.warn("Could not list ElevenLabs voices; using the default Rachel voice ID.");
    return defaultVoiceId;
  }

  const data = await response.json();
  const voices = Array.isArray(data.voices) ? data.voices : [];
  const preferredNames = ["Rachel", "Jessica", "Laura", "Lily"];
  const preferredVoice = preferredNames
    .map((name) => voices.find((voice) => voice.name === name))
    .find(Boolean);
  const voice = preferredVoice || voices[0];
  if (!voice?.voice_id) throw new Error("No ElevenLabs voices are available for this account.");
  return voice.voice_id;
}

async function generateAudio(text, filename, voiceId) {
  const filePath = path.join(outputDir, filename);
  if (!force && existsSync(filePath)) {
    console.log(`Skipping existing ${filename}`);
    return;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.68,
          similarity_boost: 0.82,
          style: 0.22,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Could not generate ${filename}: ${response.status} ${await response.text()}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, audio);
  console.log(`Generated ${filename}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
