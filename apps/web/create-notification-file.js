// create-notification-file.js
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple WAV file header for a beep sound
function createBeepWAV() {
  const sampleRate = 44100;
  const duration = 0.3; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  
  // Create WAV header
  const header = Buffer.alloc(44);
  // RIFF chunk
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + numSamples * 2, 4); // File size - 8
  header.write('WAVE', 8);
  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // Audio format (PCM)
  header.writeUInt16LE(numChannels, 22); // Number of channels
  header.writeUInt32LE(sampleRate, 24); // Sample rate
  header.writeUInt32LE(byteRate, 28); // Byte rate
  header.writeUInt16LE(blockAlign, 32); // Block align
  header.writeUInt16LE(bitsPerSample, 34); // Bits per sample
  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(numSamples * 2, 40); // Data size
  
  // Create audio data (simple beep)
  const data = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Two-tone notification sound
    const frequency = t < duration * 0.5 ? 800 : 1200;
    const sample = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 2);
    const value = Math.floor(sample * 0.5 * 32767);
    data.writeInt16LE(value, i * 2);
  }
  
  return Buffer.concat([header, data]);
}

// Create the file
try {
  // Ensure public directory exists
  const publicDir = join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const wavData = createBeepWAV();
  const wavPath = join(publicDir, 'notification.wav');
  fs.writeFileSync(wavPath, wavData);
  console.log('✅ Created notification.wav in public folder');
  
  console.log('⚠️ For MP3 format, you can use ffmpeg:');
  console.log('   ffmpeg -i public/notification.wav -acodec mp3 public/notification.mp3');
  console.log('   Or use an online converter to convert the WAV to MP3');
} catch (error) {
  console.error('Error creating sound file:', error);
}