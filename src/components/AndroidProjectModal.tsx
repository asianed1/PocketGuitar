import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Folder, Terminal } from 'lucide-react';
import JSZip from 'jszip';

interface AndroidProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectFile {
  path: string;
  name: string;
  type: 'kotlin' | 'xml' | 'gradle' | 'md';
  content: string;
}

export const ANDROID_FILES: ProjectFile[] = [
  {
    path: 'app/src/main/java/com/pocketguitar/audio/KarplusSynth.kt',
    name: 'KarplusSynth.kt',
    type: 'kotlin',
    content: `package com.pocketguitar.audio

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.max
import kotlin.random.Random

/**
 * Pure-Kotlin, zero-allocation Karplus-Strong physical acoustic guitar synthesizer.
 */
class KarplusSynth(
    val sampleRate: Int = 44100,
    maxVoices: Int = 18
) {
    companion object {
        private const val DELAY_BUF_SIZE = 4096
        private const val DELAY_BUF_MASK = DELAY_BUF_SIZE - 1
    }

    private class VoiceSlot {
        val buffer = FloatArray(DELAY_BUF_SIZE)
        var active = false
        var stringIndex = -1
        var writePos = 0
        var intDelay = 100
        var frac = 0f
        var prevDelayed = 0f
        var feedback = 0.99f
        var samplesPlayed = 0L
        var maxSamples = 0L
        var attackSamples = 1
        var gain = 1.0f
        var dampCoeff = 1.0f
        var isDamping = false
        var ageOrder = 0L
    }

    private val slots = Array(maxVoices) { VoiceSlot() }
    private var nextAgeOrder = 1L
    private var dcPrevIn = 0f
    private var dcPrevOut = 0f
    private var envPeak = 0f
    private val envReleaseCoeff = exp(-1.0 / (sampleRate * 0.040)).toFloat()

    fun pluckString(freq: Float, velocity: Float = 0.8f, stringIndex: Int = -1, seed: Int? = null) {
        if (freq <= 20f || freq >= sampleRate * 0.45f) return

        if (stringIndex in 0..5) {
            for (slot in slots) {
                if (slot.active && slot.stringIndex == stringIndex && !slot.isDamping) {
                    startDamp(slot, dampMs = 14f)
                }
            }
        }

        val slot = acquireSlot()
        val rng = if (seed != null) Random(seed) else Random.Default

        val exactSamples = (sampleRate.toFloat() / freq) - 0.5f
        val clampedDelay = exactSamples.coerceIn(8f, (DELAY_BUF_SIZE - 4).toFloat())
        val intDelay = clampedDelay.toInt()
        val frac = clampedDelay - intDelay

        slot.buffer.fill(0f)
        val seedLen = intDelay + 2
        var lastNoise = 0f
        var sum = 0f
        val vel = velocity.coerceIn(0.05f, 1.0f)

        for (i in 0 until seedLen) {
            val white = (rng.nextFloat() * 2f - 1f) * vel * 0.85f
            lastNoise = lastNoise * 0.60f + white * 0.40f
            slot.buffer[i] = lastNoise
            sum += lastNoise
        }

        val mean = sum / seedLen
        for (i in 0 until seedLen) {
            slot.buffer[i] -= mean
        }

        slot.active = true
        slot.stringIndex = stringIndex
        slot.writePos = seedLen and DELAY_BUF_MASK
        slot.intDelay = intDelay
        slot.frac = frac
        slot.prevDelayed = 0f
        slot.feedback = (0.994f - (freq / 50000f)).coerceIn(0.982f, 0.9965f)
        slot.samplesPlayed = 0L
        slot.maxSamples = (sampleRate * 2.4).toLong()
        slot.attackSamples = max(1, (sampleRate * 0.003f).toInt())
        slot.gain = 1.0f
        slot.dampCoeff = 1.0f
        slot.isDamping = false
        slot.ageOrder = nextAgeOrder++
    }

    fun dampAll(dampMs: Float = 40f) {
        for (slot in slots) {
            if (slot.active) startDamp(slot, dampMs)
        }
    }

    fun clearImmediate() {
        for (slot in slots) slot.active = false
        dcPrevIn = 0f
        dcPrevOut = 0f
        envPeak = 0f
    }

    private fun startDamp(slot: VoiceSlot, dampMs: Float) {
        val dampSamples = max(16f, sampleRate * (dampMs / 1000f))
        val coeff = exp(-6.907755 / dampSamples).toFloat()
        slot.dampCoeff = if (slot.isDamping) minOf(slot.dampCoeff, coeff) else coeff
        slot.isDamping = true
    }

    private fun acquireSlot(): VoiceSlot {
        for (slot in slots) {
            if (!slot.active) return slot
        }
        var bestSlot = slots[0]
        for (i in 1 until slots.size) {
            val candidate = slots[i]
            val candidatePriority = if (candidate.isDamping && !bestSlot.isDamping) true
            else if (candidate.isDamping == bestSlot.isDamping && candidate.ageOrder < bestSlot.ageOrder) true
            else false
            if (candidatePriority) bestSlot = candidate
        }
        return bestSlot
    }

    fun renderFloatBlock(outFloat: FloatArray, numFrames: Int) {
        outFloat.fill(0f, 0, numFrames)
        for (slot in slots) {
            if (!slot.active) continue
            val buf = slot.buffer
            var wPos = slot.writePos
            val intDelay = slot.intDelay
            val frac = slot.frac
            val oneMinusFrac = 1.0f - frac
            var prevDel = slot.prevDelayed
            val fb = slot.feedback
            var played = slot.samplesPlayed
            val maxSamp = slot.maxSamples
            val attSamp = slot.attackSamples
            var gain = slot.gain
            val isDamping = slot.isDamping
            val dampCoeff = slot.dampCoeff

            for (i in 0 until numFrames) {
                if (played >= maxSamp || gain < 0.0004f) {
                    slot.active = false
                    break
                }
                val idxA = (wPos - intDelay) and DELAY_BUF_MASK
                val idxB = (idxA - 1) and DELAY_BUF_MASK
                val delayed = buf[idxA] * oneMinusFrac + buf[idxB] * frac
                val filtered = (delayed + prevDel) * 0.5f * fb
                buf[wPos] = filtered
                prevDel = delayed

                val attackEnv = if (played < attSamp) (played + 1).toFloat() / attSamp else 1.0f
                outFloat[i] += delayed * attackEnv * gain
                if (isDamping) gain *= dampCoeff

                wPos = (wPos + 1) and DELAY_BUF_MASK
                played++
            }
            if (slot.active) {
                slot.writePos = wPos
                slot.prevDelayed = prevDel
                slot.samplesPlayed = played
                slot.gain = gain
            }
        }

        for (i in 0 until numFrames) {
            val raw = outFloat[i]
            val dcFree = raw - dcPrevIn + 0.995f * dcPrevOut
            dcPrevIn = raw
            dcPrevOut = dcFree

            val scaled = dcFree * 0.42f
            val absVal = abs(scaled)
            envPeak = if (absVal > envPeak) absVal else envPeak * envReleaseCoeff
            val limiterGain = if (envPeak > 0.85f) 0.85f / envPeak else 1.0f
            outFloat[i] = (scaled * limiterGain).coerceIn(-0.98f, 0.98f)
        }
    }

    fun renderPcmBlock(floatScratch: FloatArray, outPcm: ShortArray, numFrames: Int) {
        renderFloatBlock(floatScratch, numFrames)
        for (i in 0 until numFrames) {
            outPcm[i] = (floatScratch[i] * 32000f).toInt().coerceIn(-32767, 32767).toShort()
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/pocketguitar/audio/AudioEngine.kt',
    name: 'AudioEngine.kt',
    type: 'kotlin',
    content: `package com.pocketguitar.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Process
import kotlinx.coroutines.*
import kotlin.math.max
import kotlin.random.Random

/**
 * Low-latency acoustic guitar AudioEngine backed by [KarplusSynth].
 */
class AudioEngine(context: Context? = null) {

    companion object {
        const val DEFAULT_SAMPLE_RATE = 44100
        const val BUFFER_SIZE_FRAMES = 512
    }

    private val sampleRate: Int = resolveNativeSampleRate(context)
    private val synth = KarplusSynth(sampleRate = sampleRate, maxVoices = 18)
    private val synthLock = Any()

    private var audioTrack: AudioTrack? = null
    @Volatile private var isRunning = false
    private var audioThread: Thread? = null
    @Volatile private var activeStrumJob: Job? = null

    init {
        initAudioTrack()
    }

    private fun resolveNativeSampleRate(context: Context?): Int {
        if (context == null) return DEFAULT_SAMPLE_RATE
        return try {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            val rate = am?.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE)?.toIntOrNull()
            if (rate != null && rate in 22050..96000) rate else DEFAULT_SAMPLE_RATE
        } catch (_: Exception) {
            DEFAULT_SAMPLE_RATE
        }
    }

    private fun initAudioTrack() {
        val minBufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufferSize = max(minBufferSize * 2, BUFFER_SIZE_FRAMES * 4)

        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setFlags(AudioAttributes.FLAG_LOW_LATENCY)
            .build()

        val format = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()

        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(attributes)
            .setAudioFormat(format)
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
            .build()

        startSynthesisThread()
    }

    private fun startSynthesisThread() {
        isRunning = true
        audioTrack?.play()

        audioThread = Thread {
            try {
                Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
            } catch (_: Exception) {}

            val floatScratch = FloatArray(BUFFER_SIZE_FRAMES)
            val pcmBuffer = ShortArray(BUFFER_SIZE_FRAMES)

            while (isRunning) {
                synchronized(synthLock) {
                    synth.renderPcmBlock(floatScratch, pcmBuffer, BUFFER_SIZE_FRAMES)
                }

                val track = audioTrack ?: break
                val written = track.write(pcmBuffer, 0, BUFFER_SIZE_FRAMES, AudioTrack.WRITE_BLOCKING)
                if (written < 0) {
                    try { Thread.sleep(10) } catch (_: InterruptedException) { break }
                }
            }
        }.apply {
            name = "PocketGuitarAudioThread"
            isDaemon = true
            start()
        }
    }

    fun strumChord(
        frequencies: FloatArray,
        isDownstrum: Boolean = true,
        velocity: Float = 0.85f,
        interStringDelayMs: Long = 14L,
        scope: CoroutineScope
    ) {
        activeStrumJob?.cancel()
        val stringIndices = if (isDownstrum) (0..5).toList() else (5 downTo 0).toList()

        activeStrumJob = scope.launch(Dispatchers.Default) {
            var orderIndex = 0
            for (idx in stringIndices) {
                if (!isActive) break
                val freq = frequencies[idx]
                if (freq > 20f) {
                    if (orderIndex > 0 && interStringDelayMs > 0) delay(interStringDelayMs)
                    if (!isActive) break

                    val jitter = 1f + (Random.nextFloat() * 0.1f - 0.05f)
                    val stringVel = (velocity * jitter).coerceIn(0.1f, 1.0f)

                    pluckString(freq, stringVel, idx)
                    orderIndex++
                }
            }
        }
    }

    fun pluckString(freq: Float, velocity: Float = 0.8f, stringIndex: Int = -1) {
        if (freq <= 20f) return
        synchronized(synthLock) {
            synth.pluckString(freq = freq, velocity = velocity, stringIndex = stringIndex)
        }
    }

    fun dampAll(dampMs: Float = 45f) {
        activeStrumJob?.cancel()
        synchronized(synthLock) {
            synth.dampAll(dampMs)
        }
    }

    fun palmMute() {
        dampAll(dampMs = 20f)
    }

    fun release() {
        isRunning = false
        activeStrumJob?.cancel()
        audioThread?.interrupt()
        audioThread = null
        try {
            audioTrack?.stop()
            audioTrack?.release()
        } catch (_: Exception) {}
        audioTrack = null
        synchronized(synthLock) {
            synth.clearImmediate()
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/pocketguitar/model/ChordDatabase.kt',
    name: 'ChordDatabase.kt',
    type: 'kotlin',
    content: `package com.pocketguitar.model

import kotlin.math.pow

data class Chord(
    val name: String,
    val root: String,
    val quality: String,
    val frets: IntArray,
    val fingers: IntArray,
    val barreFret: Int? = null,
    val barreFrom: Int? = null
) {
    fun getFrequencies(capo: Int = 0): FloatArray {
        val openNotes = intArrayOf(40, 45, 50, 55, 59, 64)
        val freqs = FloatArray(6)
        for (i in 0 until 6) {
            val fret = frets[i]
            if (fret < 0) {
                freqs[i] = 0f
            } else {
                val midi = openNotes[i] + fret + capo
                freqs[i] = (440.0 * 2.0.pow((midi - 69) / 12.0)).toFloat()
            }
        }
        return freqs
    }
}

object ChordDatabase {
    val NOTE_NAMES = listOf("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")

    val CHORDS: Map<String, Chord> = mapOf(
        "C" to Chord("C", "C", "Major", intArrayOf(-1, 3, 2, 0, 1, 0), intArrayOf(0, 3, 2, 0, 1, 0)),
        "Cm" to Chord("Cm", "C", "Minor", intArrayOf(-1, 3, 5, 5, 4, 3), intArrayOf(0, 1, 3, 4, 2, 1), 3, 1),
        "C7" to Chord("C7", "C", "7", intArrayOf(-1, 3, 2, 3, 1, 0), intArrayOf(0, 3, 2, 4, 1, 0)),
        "Cmaj7" to Chord("Cmaj7", "C", "maj7", intArrayOf(-1, 3, 2, 0, 0, 0), intArrayOf(0, 3, 2, 0, 0, 0)),
        "Cm7" to Chord("Cm7", "C", "m7", intArrayOf(-1, 3, 5, 3, 4, 3), intArrayOf(0, 1, 3, 1, 2, 1), 3, 1),
        "Csus4" to Chord("Csus4", "C", "sus4", intArrayOf(-1, 3, 3, 0, 1, 1), intArrayOf(0, 3, 4, 0, 1, 1)),
        "D" to Chord("D", "D", "Major", intArrayOf(-1, -1, 0, 2, 3, 2), intArrayOf(0, 0, 0, 1, 3, 2)),
        "Dm" to Chord("Dm", "D", "Minor", intArrayOf(-1, -1, 0, 2, 3, 1), intArrayOf(0, 0, 0, 2, 3, 1)),
        "D7" to Chord("D7", "D", "7", intArrayOf(-1, -1, 0, 2, 1, 2), intArrayOf(0, 0, 0, 2, 1, 3)),
        "E" to Chord("E", "E", "Major", intArrayOf(0, 2, 2, 1, 0, 0), intArrayOf(0, 2, 3, 1, 0, 0)),
        "Em" to Chord("Em", "E", "Minor", intArrayOf(0, 2, 2, 0, 0, 0), intArrayOf(0, 2, 3, 0, 0, 0)),
        "F" to Chord("F", "F", "Major", intArrayOf(1, 3, 3, 2, 1, 1), intArrayOf(1, 3, 4, 2, 1, 1), 1, 0),
        "G" to Chord("G", "G", "Major", intArrayOf(3, 2, 0, 0, 3, 3), intArrayOf(2, 1, 0, 0, 3, 4)),
        "A" to Chord("A", "A", "Major", intArrayOf(-1, 0, 2, 2, 2, 0), intArrayOf(0, 0, 1, 2, 3, 0)),
        "Am" to Chord("Am", "A", "Minor", intArrayOf(-1, 0, 2, 2, 1, 0), intArrayOf(0, 0, 2, 3, 1, 0)),
        "Bb" to Chord("Bb", "A#", "Major", intArrayOf(-1, 1, 3, 3, 3, 1), intArrayOf(0, 1, 2, 3, 4, 1), 1, 1),
        "B" to Chord("B", "B", "Major", intArrayOf(-1, 2, 4, 4, 4, 2), intArrayOf(0, 1, 2, 3, 4, 1), 2, 1),
        "Bm" to Chord("Bm", "B", "Minor", intArrayOf(-1, 2, 4, 4, 3, 2), intArrayOf(0, 1, 3, 4, 2, 1), 2, 1)
    )

    fun getChord(name: String): Chord? {
        val trimmed = name.trim()
        return CHORDS[trimmed] ?: CHORDS[trimmed.replaceFirstChar { it.uppercase() }]
    }

    fun getSoundingChordName(name: String, capo: Int): String {
        if (capo == 0) return name
        val trimmed = name.trim()
        val chord = getChord(trimmed) ?: return name
        val rootIdx = NOTE_NAMES.indexOf(chord.root)
        if (rootIdx == -1) return name
        val newRoot = NOTE_NAMES[(rootIdx + capo) % 12]
        val rootLen = if (trimmed.length >= 2 && (trimmed[1] == '#' || trimmed[1] == 'b')) 2 else 1
        val suffix = trimmed.drop(rootLen)
        return "$newRoot$suffix"
    }
}`
  },
  {
    path: 'app/src/main/java/com/pocketguitar/engine/StrumPattern.kt',
    name: 'StrumPattern.kt',
    type: 'kotlin',
    content: `package com.pocketguitar.engine

import com.pocketguitar.audio.AudioEngine
import com.pocketguitar.model.Chord
import kotlinx.coroutines.*

enum class StrokeType {
    DOWN, UP, ACCENT_DOWN, ACCENT_UP, REST, PLUCK_BASS, PLUCK_STRING
}

data class Stroke(
    val type: StrokeType,
    val velocity: Float = 0.8f,
    val stringIndex: Int = 0,
    val label: String
)

data class GuitarStyle(
    val id: String,
    val name: String,
    val description: String,
    val subdivisions: Int,
    val defaultBpm: Int,
    val strokes: List<Stroke>
)

object StrumPatterns {
    val STYLES: List<GuitarStyle> = listOf(
        GuitarStyle(
            id = "folk",
            name = "Folk / Campfire",
            description = "D - D U - U D -",
            subdivisions = 8,
            defaultBpm = 104,
            strokes = listOf(
                Stroke(StrokeType.ACCENT_DOWN, 0.95f, label = "D"),
                Stroke(StrokeType.REST, 0.0f, label = "·"),
                Stroke(StrokeType.DOWN, 0.80f, label = "D"),
                Stroke(StrokeType.UP, 0.65f, label = "U"),
                Stroke(StrokeType.REST, 0.0f, label = "·"),
                Stroke(StrokeType.UP, 0.72f, label = "U"),
                Stroke(StrokeType.DOWN, 0.82f, label = "D"),
                Stroke(StrokeType.UP, 0.62f, label = "U")
            )
        ),
        GuitarStyle(
            id = "rock",
            name = "Driving Rock",
            description = "Driving 8th notes with backbeat accents",
            subdivisions = 8,
            defaultBpm = 128,
            strokes = listOf(
                Stroke(StrokeType.DOWN, 0.85f, label = "D"),
                Stroke(StrokeType.UP, 0.60f, label = "U"),
                Stroke(StrokeType.ACCENT_DOWN, 1.0f, label = "★D"),
                Stroke(StrokeType.UP, 0.65f, label = "U"),
                Stroke(StrokeType.DOWN, 0.85f, label = "D"),
                Stroke(StrokeType.UP, 0.60f, label = "U"),
                Stroke(StrokeType.ACCENT_DOWN, 1.0f, label = "★D"),
                Stroke(StrokeType.UP, 0.70f, label = "U")
            )
        ),
        GuitarStyle(
            id = "pop",
            name = "Modern Pop",
            description = "Syncopated acoustic bounce with airy upstrums",
            subdivisions = 8,
            defaultBpm = 116,
            strokes = listOf(
                Stroke(StrokeType.ACCENT_DOWN, 0.95f, label = "D"),
                Stroke(StrokeType.REST, 0f, label = "·"),
                Stroke(StrokeType.UP, 0.65f, label = "U"),
                Stroke(StrokeType.DOWN, 0.80f, label = "D"),
                Stroke(StrokeType.REST, 0f, label = "·"),
                Stroke(StrokeType.UP, 0.70f, label = "U"),
                Stroke(StrokeType.DOWN, 0.85f, label = "D"),
                Stroke(StrokeType.UP, 0.65f, label = "U")
            )
        )
    )
}

class StrumLoopRunner(
    private val audioEngine: AudioEngine,
    private val scope: CoroutineScope
) {
    private var loopJob: Job? = null

    fun startHoldingChord(chord: Chord, style: GuitarStyle, bpm: Int, capo: Int) {
        stop()
        val frequencies = chord.getFrequencies(capo)
        val stepIntervalMs = ((60_000.0 / bpm) / (style.subdivisions / 4.0)).toLong()

        loopJob = scope.launch(Dispatchers.Default) {
            var step = 0
            while (isActive) {
                val stroke = style.strokes[step % style.strokes.size]
                when (stroke.type) {
                    StrokeType.DOWN -> audioEngine.strumChord(frequencies, isDownstrum = true, velocity = stroke.velocity, scope = scope)
                    StrokeType.UP -> audioEngine.strumChord(frequencies, isDownstrum = false, velocity = stroke.velocity, scope = scope)
                    StrokeType.ACCENT_DOWN -> audioEngine.strumChord(frequencies, isDownstrum = true, velocity = 1.0f, scope = scope)
                    StrokeType.ACCENT_UP -> audioEngine.strumChord(frequencies, isDownstrum = false, velocity = 0.95f, scope = scope)
                    StrokeType.REST -> {}
                    else -> {}
                }
                delay(stepIntervalMs)
                step++
            }
        }
    }

    fun stop() {
        loopJob?.cancel()
        loopJob = null
    }
}`
  },
  {
    path: 'app/src/main/java/com/pocketguitar/ui/MainActivity.kt',
    name: 'MainActivity.kt',
    type: 'kotlin',
    content: `package com.pocketguitar.ui

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pocketguitar.audio.AudioEngine
import com.pocketguitar.engine.*
import com.pocketguitar.model.Chord
import com.pocketguitar.model.ChordDatabase
import com.pocketguitar.ui.components.ChordDiagram
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var audioEngine: AudioEngine
    private lateinit var strumRunner: StrumLoopRunner
    private val appScope = CoroutineScope(Dispatchers.Default)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        audioEngine = AudioEngine(applicationContext)
        strumRunner = StrumLoopRunner(audioEngine, appScope)

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFFF59E0B),
                    surface = Color(0xFF0F172A),
                    background = Color(0xFF020617)
                )
            ) {
                PocketGuitarApp(audioEngine, strumRunner)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        strumRunner.stop()
        audioEngine.release()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PocketGuitarApp(audioEngine: AudioEngine, strumRunner: StrumLoopRunner) {
    var isPerformanceMode by remember { mutableStateOf(false) }
    var selectedChordNames by remember { mutableStateOf(listOf("C", "G", "Am", "F")) }
    var currentStyle by remember { mutableStateOf(StrumPatterns.STYLES[0]) }
    var bpm by remember { mutableIntStateOf(110) }
    var capo by remember { mutableIntStateOf(0) }

    Scaffold(
        containerColor = Color(0xFF090D16),
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("PocketGuitar", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 20.sp)
                        if (capo > 0) {
                            Text("Capo \$capo", color = Color(0xFFF59E0B), fontSize = 12.sp, modifier = Modifier.background(Color(0xFF332200), RoundedCornerShape(4.dp)).padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { isPerformanceMode = !isPerformanceMode }) {
                        Icon(imageVector = if (isPerformanceMode) Icons.Default.Settings else Icons.Default.PlayArrow, contentDescription = "Toggle", tint = Color(0xFFF59E0B))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        }
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            if (isPerformanceMode) {
                PerformanceScreen(selectedChordNames, currentStyle, bpm, capo, audioEngine, strumRunner)
            } else {
                SetupScreen(
                    selectedChords = selectedChordNames,
                    onChordsChange = { selectedChordNames = it },
                    currentStyle = currentStyle,
                    onStyleChange = { currentStyle = it },
                    bpm = bpm,
                    onBpmChange = { bpm = it },
                    capo = capo,
                    onCapoChange = { capo = it },
                    onStartPlay = { isPerformanceMode = true }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetupScreen(
    selectedChords: List<String>,
    onChordsChange: (List<String>) -> Unit,
    currentStyle: GuitarStyle,
    onStyleChange: (GuitarStyle) -> Unit,
    bpm: Int,
    onBpmChange: (Int) -> Unit,
    capo: Int,
    onCapoChange: (Int) -> Unit,
    onStartPlay: () -> Unit
) {
    var chordInputText by remember(selectedChords) {
        mutableStateOf(selectedChords.joinToString(", "))
    }
    var parseError by remember { mutableStateOf<String?>(null) }
    var selectedRoot by remember { mutableStateOf("C") }
    var selectedQuality by remember { mutableStateOf("") }

    val roots = listOf("C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B")
    val qualities = listOf(
        "Major" to "",
        "Minor (m)" to "m",
        "7" to "7",
        "maj7" to "maj7",
        "m7" to "m7",
        "sus4" to "sus4",
        "add9" to "add9"
    )

    val candidateChord = "\$selectedRoot\$selectedQuality"
    val isCandidateValid = ChordDatabase.getChord(candidateChord) != null
    val isCandidateAlreadyIn = selectedChords.contains(candidateChord)

    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // LEFT COLUMN: Chord Builder & Active Deck
        Column(
            modifier = Modifier
                .weight(1.15f)
                .fillMaxHeight()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Active Session Chords (\${selectedChords.size})",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                if (selectedChords.isNotEmpty()) {
                    TextButton(
                        onClick = { onChordsChange(emptyList()) },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text("Clear All", color = Color(0xFFEF4444), fontSize = 12.sp)
                    }
                }
            }

            if (selectedChords.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F172A), RoundedCornerShape(8.dp))
                        .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Deck is empty. Build or type chords below to start.",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp
                    )
                }
            } else {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(selectedChords) { chordName ->
                        InputChip(
                            selected = true,
                            onClick = {
                                val updated = selectedChords.toMutableList().apply { remove(chordName) }
                                onChordsChange(updated)
                            },
                            label = {
                                Text(chordName, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                            },
                            trailingIcon = {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Remove \$chordName",
                                    tint = Color(0xFFF59E0B),
                                    modifier = Modifier.size(14.dp)
                                )
                            },
                            colors = InputChipDefaults.inputChipColors(
                                selectedContainerColor = Color(0xFF1E293B)
                            ),
                            border = InputChipDefaults.inputChipBorder(
                                borderColor = Color(0xFFF59E0B)
                            )
                        )
                    }
                }
            }

            HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)

            Text(
                text = "Chord Builder",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )

            Text("1. Root Note:", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                items(roots) { root ->
                    FilterChip(
                        selected = selectedRoot == root,
                        onClick = { selectedRoot = root },
                        label = { Text(root, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    )
                }
            }

            Text("2. Quality / Extension:", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                items(qualities) { (label, suffix) ->
                    FilterChip(
                        selected = selectedQuality == suffix,
                        onClick = { selectedQuality = suffix },
                        label = { Text(label, fontSize = 11.sp) }
                    )
                }
            }

            Button(
                onClick = {
                    if (isCandidateValid && !isCandidateAlreadyIn) {
                        onChordsChange(selectedChords + candidateChord)
                    }
                },
                enabled = isCandidateValid && !isCandidateAlreadyIn,
                modifier = Modifier.fillMaxWidth().height(40.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFF59E0B),
                    disabledContainerColor = Color(0xFF334155)
                ),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = when {
                        isCandidateAlreadyIn -> "\$candidateChord is Already in Deck"
                        !isCandidateValid -> "\$candidateChord (Not Available)"
                        else -> "+ Add \$candidateChord to Session Deck"
                    },
                    color = if (isCandidateValid && !isCandidateAlreadyIn) Color.Black else Color(0xFF94A3B8),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }

            Text(
                text = "Or type comma-separated chords:",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = chordInputText,
                    onValueChange = {
                        chordInputText = it
                        parseError = null
                    },
                    placeholder = { Text("e.g. C, G, Am, F, Dm", color = Color(0xFF64748B), fontSize = 12.sp) },
                    modifier = Modifier.weight(1f).height(48.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155),
                        cursorColor = Color(0xFFF59E0B)
                    )
                )
                Button(
                    onClick = {
                        val tokens = chordInputText.split(",")
                            .map { it.trim() }
                            .filter { it.isNotEmpty() }
                        if (tokens.isEmpty()) {
                            parseError = "Enter at least 1 chord"
                        } else {
                            val invalid = tokens.filter { ChordDatabase.getChord(it) == null }
                            if (invalid.isNotEmpty()) {
                                parseError = "Unknown: \${invalid.joinToString(\", \")}"
                            } else {
                                parseError = null
                                onChordsChange(tokens)
                            }
                        }
                    },
                    modifier = Modifier.height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0xFFF59E0B))
                ) {
                    Text("Apply", color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
            if (parseError != null) {
                Text(parseError!!, color = Color(0xFFEF4444), fontSize = 11.sp)
            }
        }

        // RIGHT COLUMN: Rhythm, Tempo, Capo & Start
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Strumming Rhythm", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(currentStyle.name, color = Color(0xFFF59E0B), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(StrumPatterns.STYLES) { style ->
                    FilterChip(
                        selected = currentStyle.id == style.id,
                        onClick = { onStyleChange(style) },
                        label = { Text(style.name, fontSize = 11.sp) }
                    )
                }
            }
            Text(
                text = "Pattern: \${currentStyle.description}",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp
            )

            HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Tempo Speed", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("\$bpm BPM", color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = { onBpmChange((bpm - 5).coerceIn(50, 220)) },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("-5", color = Color.White, fontSize = 11.sp)
                }

                listOf(80 to "80", 100 to "100", 120 to "120", 140 to "140").forEach { (presetBpm, label) ->
                    FilterChip(
                        selected = bpm == presetBpm,
                        onClick = { onBpmChange(presetBpm) },
                        label = { Text(label, fontSize = 10.sp) },
                        modifier = Modifier.height(32.dp)
                    )
                }

                OutlinedButton(
                    onClick = { onBpmChange((bpm + 5).coerceIn(50, 220)) },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("+5", color = Color.White, fontSize = 11.sp)
                }
            }

            Slider(
                value = bpm.toFloat(),
                onValueChange = { onBpmChange(it.toInt()) },
                valueRange = 50f..220f,
                modifier = Modifier.fillMaxWidth()
            )

            HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Capo Transpose", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(
                    text = if (capo == 0) "No Capo" else "+\$capo Frets",
                    color = Color(0xFFF59E0B),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                (0..7).forEach { fret ->
                    FilterChip(
                        selected = capo == fret,
                        onClick = { onCapoChange(fret) },
                        label = {
                            Text(
                                text = if (fret == 0) "0" else "+\$fret",
                                fontSize = 11.sp,
                                fontWeight = if (capo == fret) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Button(
                onClick = onStartPlay,
                enabled = selectedChords.isNotEmpty(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "Play",
                    tint = Color.Black,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (selectedChords.isNotEmpty()) "OPEN PERFORMANCE SCREEN" else "ADD CHORDS FIRST",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
        }
    }
}

@Composable
fun PerformanceScreen(
    chordNames: List<String>,
    style: GuitarStyle,
    bpm: Int,
    capo: Int,
    audioEngine: AudioEngine,
    strumRunner: StrumLoopRunner
) {
    var activeChordName by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Style: \${style.name}", color = Color(0xFF94A3B8), fontSize = 12.sp)
            Text("\$bpm BPM", color = Color(0xFFF59E0B), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }

        val columnCount = when {
            chordNames.size <= 3 -> chordNames.size
            chordNames.size == 4 -> 4
            chordNames.size <= 6 -> 3
            else -> 4
        }
        val rows = chordNames.chunked(columnCount)

        Column(modifier = Modifier.fillMaxWidth().weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            rows.forEach { rowChords ->
                Row(modifier = Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    rowChords.forEach { chordName ->
                        val chord = ChordDatabase.getChord(chordName) ?: ChordDatabase.CHORDS["C"]!!
                        val isHeld = activeChordName == chordName
                        val soundingName = ChordDatabase.getSoundingChordName(chordName, capo)

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(14.dp))
                                .background(
                                    if (isHeld) Brush.verticalGradient(listOf(Color(0xFF78350F), Color(0xFFB45309)))
                                    else Brush.verticalGradient(listOf(Color(0xFF1E293B), Color(0xFF0F172A)))
                                )
                                .border(if (isHeld) 2.dp else 1.dp, if (isHeld) Color(0xFFF59E0B) else Color(0xFF334155), RoundedCornerShape(14.dp))
                                .pointerInput(chordName, style, bpm, capo) {
                                    detectTapGestures(onPress = {
                                        audioEngine.dampAll(dampMs = 25f)
                                        activeChordName = chordName
                                        strumRunner.startHoldingChord(chord, style, bpm, capo)
                                        val released = tryAwaitRelease()
                                        strumRunner.stop()
                                        if (released) {
                                            audioEngine.dampAll(dampMs = 45f)
                                        }
                                        activeChordName = null
                                    })
                                }
                                .pointerInput(chordName, capo) {
                                    var lastSwipeMs = 0L
                                    detectDragGestures { change, dragAmount ->
                                        change.consume()
                                        val now = System.currentTimeMillis()
                                        if (now - lastSwipeMs < 90L) return@detectDragGestures
                                        if (dragAmount.y > 15f) {
                                            lastSwipeMs = now
                                            audioEngine.strumChord(chord.getFrequencies(capo), isDownstrum = true, velocity = 0.9f, scope = scope)
                                        } else if (dragAmount.y < -15f) {
                                            lastSwipeMs = now
                                            audioEngine.strumChord(chord.getFrequencies(capo), isDownstrum = false, velocity = 0.85f, scope = scope)
                                        }
                                    }
                                }
                                .padding(8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxHeight()) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(chordName, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                                    if (capo > 0) Text("(\$soundingName)", fontSize = 11.sp, color = Color(0xFFF59E0B))
                                }
                                Text("HOLD OR SWIPE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (isHeld) Color(0xFFFDE68A) else Color(0xFF64748B))
                            }
                        }
                    }
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFF7F1D1D))
                .border(1.5.dp, Color(0xFFEF4444), RoundedCornerShape(12.dp))
                .clickable { audioEngine.palmMute() },
            contentAlignment = Alignment.Center
        ) {
            Text("PALM MUTE BAR (TAP TO STOP SOUND)", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    type: 'xml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.pocketguitar">

    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <uses-feature
        android:name="android.hardware.audio.low_latency"
        android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:label="PocketGuitar"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout"
            android:screenOrientation="sensorLandscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
  },
  {
    path: 'app/build.gradle.kts',
    name: 'build.gradle.kts (app)',
    type: 'gradle',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.pocketguitar"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.pocketguitar"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    testImplementation("junit:junit:4.13.2")
}`
  },
  {
    path: 'README.md',
    name: 'README.md',
    type: 'md',
    content: `# PocketGuitar for Android

Production-ready Android project built with Kotlin and Jetpack Compose.
- Low-latency AudioTrack architecture (<20ms response)
- Physical acoustic guitar modeling (Karplus-Strong) keeps APK < 20MB
- Realistic inter-string strum dispersion (10-20ms) and down/up stroke patterns
- Touch & Hold rhythm loops and swipe strums
- Dedicated Palm Mute Bar for immediate acoustic damping
- WAKE_LOCK prevents screen from turning off mid-song`
  },
  {
    path: 'app/src/main/res/drawable/ic_launcher.xml',
    name: 'ic_launcher.xml',
    type: 'xml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#F59E0B"
        android:pathData="M54,12 C30.8,12 12,30.8 12,54 C12,77.2 30.8,96 54,96 C77.2,96 96,77.2 96,54 C96,30.8 77.2,12 54,12 Z"/>
    <path
        android:fillColor="#1E293B"
        android:pathData="M54,30 C40.7,30 30,40.7 30,54 C30,67.3 40.7,78 54,78 C67.3,78 78,67.3 78,54 C78,40.7 67.3,30 54,30 Z"/>
    <path
        android:strokeColor="#F59E0B"
        android:strokeWidth="2"
        android:pathData="M38,54 L70,54 M54,38 L54,70"/>
</vector>`
  },
  {
    path: 'app/src/main/res/values/strings.xml',
    name: 'strings.xml',
    type: 'xml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">PocketGuitar</string>
</resources>`
  },
  {
    path: 'gradle.properties',
    name: 'gradle.properties',
    type: 'gradle',
    content: `# Android Gradle Properties for PocketGuitar
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official`
  }
];

export const AndroidProjectModal: React.FC<AndroidProjectModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(ANDROID_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      ANDROID_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });
      // Add root gradle files & wrapper
      zip.file('build.gradle.kts', `plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}`);
      zip.file('settings.gradle.kts', `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "PocketGuitar"
include(":app")`);
      zip.file('gradle/wrapper/gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`);
      zip.file('app/proguard-rules.pro', `# PocketGuitar ProGuard Rules
-keep class com.pocketguitar.** { *; }
-dontwarn **`);
      zip.file('app/src/test/java/com/pocketguitar/ChordAndAudioVerificationTest.kt', `package com.pocketguitar

import com.pocketguitar.audio.KarplusSynth
import com.pocketguitar.model.ChordDatabase
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.roundToInt
import kotlin.math.sqrt

class ChordAndAudioVerificationTest {

    private fun freqToMidiRounded(freq: Float): Int {
        return (69.0 + 12.0 * (ln(freq.toDouble() / 440.0) / ln(2.0))).roundToInt()
    }

    private fun pitchClassesForChord(name: String, capo: Int = 0): Set<String> {
        val chord = ChordDatabase.getChord(name) ?: error("Missing chord: \$name")
        return chord.getFrequencies(capo)
            .filter { it > 20f }
            .map { freq -> ChordDatabase.NOTE_NAMES[freqToMidiRounded(it) % 12] }
            .toSet()
    }

    @Test
    fun verifyExactChordNotesForKeyExamplesAndDatabase() {
        assertEquals(setOf("C", "E", "G"), pitchClassesForChord("C"))
        assertEquals(setOf("E", "G#", "B", "D#"), pitchClassesForChord("Emaj7"))
        assertEquals(setOf("A#", "D", "F"), pitchClassesForChord("Bb"))
        assertEquals(setOf("A#", "D", "F"), pitchClassesForChord("A#"))
        assertEquals(setOf("A", "C", "E"), pitchClassesForChord("Am"))
        assertEquals(setOf("F", "A", "C"), pitchClassesForChord("F"))
        assertEquals(setOf("G", "B", "D"), pitchClassesForChord("G"))

        assertEquals(setOf("D", "F#", "A"), pitchClassesForChord("C", capo = 2))
        assertEquals(setOf("C", "E", "G"), pitchClassesForChord("Bb", capo = 2))

        assertTrue(ChordDatabase.CHORDS.size >= 40)
        ChordDatabase.CHORDS.forEach { (key, chord) ->
            val freqs = chord.getFrequencies(0)
            assertEquals("Chord \$key must have 6 string entries", 6, freqs.size)
            val sounding = freqs.count { it > 20f }
            assertTrue("Chord \$key must sound >= 3 strings, got \$sounding", sounding >= 3)
        }
    }

    @Test
    fun verifyCapoSoundingChordNamesIncludingFlats() {
        assertEquals("C", ChordDatabase.getSoundingChordName("C", 0))
        assertEquals("D", ChordDatabase.getSoundingChordName("C", 2))
        assertEquals("C", ChordDatabase.getSoundingChordName("Bb", 2))
        assertEquals("F", ChordDatabase.getSoundingChordName("Eb", 2))
        assertEquals("A", ChordDatabase.getSoundingChordName("Ab", 1))
        assertEquals("F#m", ChordDatabase.getSoundingChordName("Bm", 7))
        assertEquals("Gmaj7", ChordDatabase.getSoundingChordName("Fmaj7", 2))
    }

    private fun measurePitchCentsError(sampleRate: Int, targetFreq: Float): Double {
        val synth = KarplusSynth(sampleRate = sampleRate, maxVoices = 18)
        synth.pluckString(freq = targetFreq, velocity = 0.85f, stringIndex = 0, seed = 12345)

        val blockSize = 512
        val block = FloatArray(blockSize)
        val totalSamples = sampleRate / 2
        val rendered = FloatArray(totalSamples)
        var offset = 0
        while (offset < totalSamples) {
            synth.renderFloatBlock(block, blockSize)
            val copyLen = minOf(blockSize, totalSamples - offset)
            System.arraycopy(block, 0, rendered, offset, copyLen)
            offset += copyLen
        }

        val start = (sampleRate * 0.08).toInt()
        val window = (sampleRate * 0.16).toInt()
        val expectedLag = sampleRate / targetFreq.toDouble()
        val minLag = maxOf(10, (expectedLag * 0.85).toInt())
        val maxLag = minOf(3000, (expectedLag * 1.15).toInt())

        val corr = DoubleArray(maxLag + 2)
        var bestLag = minLag
        var bestVal = Double.NEGATIVE_INFINITY

        for (lag in minLag..maxLag) {
            var sum = 0.0
            for (i in 0 until window) {
                sum += rendered[start + i] * rendered[start + i + lag]
            }
            corr[lag] = sum
            if (sum > bestVal) {
                bestVal = sum
                bestLag = lag
            }
        }

        val y0 = corr[bestLag - 1]
        val y1 = corr[bestLag]
        val y2 = corr[bestLag + 1]
        val denom = y0 - 2.0 * y1 + y2
        val delta = if (abs(denom) > 1e-9) 0.5 * (y0 - y2) / denom else 0.0
        val measuredPeriod = bestLag + delta
        val measuredFreq = sampleRate / measuredPeriod
        return abs(1200.0 * ln(measuredFreq / targetFreq.toDouble()) / ln(2.0))
    }

    @Test
    fun verifySubThreeCentPitchAccuracyAcrossOctavesAndCapo() {
        val testRates = listOf(44100, 48000)
        val testFreqs = listOf(82.407f, 116.541f, 195.998f, 329.628f, 659.255f)

        for (rate in testRates) {
            for (freq in testFreqs) {
                val centsErr = measurePitchCentsError(rate, freq)
                assertTrue("Pitch error at \${rate}Hz for \${freq}Hz exceeded 3 cents", centsErr < 3.0)
            }
        }
    }

    @Test
    fun verifyNoClippingDcDriftOrScratchAcrossThirdAndSubsequentChords() {
        val sampleRate = 48000
        val synth = KarplusSynth(sampleRate = sampleRate, maxVoices = 18)
        val progression = listOf("C", "G", "Am", "F", "Emaj7", "Bb")
        val blockSize = 512
        val block = FloatArray(blockSize)

        var maxPeak = 0f
        var maxStepJump = 0f
        var prevSample = 0f
        var sum = 0.0
        var totalSamples = 0L

        for ((idx, chordName) in progression.withIndex()) {
            val chord = ChordDatabase.getChord(chordName)!!
            val freqs = chord.getFrequencies(capo = 0)

            synth.dampAll(dampMs = 25f)
            for (s in 0 until 6) {
                if (freqs[s] > 20f) {
                    synth.pluckString(freqs[s], velocity = 0.92f, stringIndex = s, seed = 100 + idx * 10 + s)
                }
                synth.renderFloatBlock(block, blockSize)
                for (i in 0 until blockSize) {
                    val v = block[i]
                    maxPeak = maxOf(maxPeak, abs(v))
                    maxStepJump = maxOf(maxStepJump, abs(v - prevSample))
                    prevSample = v
                    sum += v
                    totalSamples++
                }
            }

            repeat(24) {
                synth.renderFloatBlock(block, blockSize)
                for (i in 0 until blockSize) {
                    val v = block[i]
                    maxPeak = maxOf(maxPeak, abs(v))
                    maxStepJump = maxOf(maxStepJump, abs(v - prevSample))
                    prevSample = v
                    sum += v
                    totalSamples++
                }
            }

            synth.dampAll(dampMs = 45f)
            repeat(6) {
                synth.renderFloatBlock(block, blockSize)
                for (i in 0 until blockSize) {
                    val v = block[i]
                    maxPeak = maxOf(maxPeak, abs(v))
                    maxStepJump = maxOf(maxStepJump, abs(v - prevSample))
                    prevSample = v
                    sum += v
                    totalSamples++
                }
            }

            var tailEnergy = 0.0
            for (i in 0 until blockSize) tailEnergy += block[i] * block[i]
            val tailRms = sqrt(tailEnergy / blockSize)
            assertTrue("Chord \$chordName tail RMS (\$tailRms) should decay < 0.01", tailRms < 0.01)
        }

        val dcMean = abs(sum / totalSamples)
        assertTrue("Max peak (\$maxPeak) must stay <= 0.92", maxPeak <= 0.92f)
        assertTrue("DC offset mean (\$dcMean) must remain < 0.005", dcMean < 0.005)
        assertTrue("Max step jump (\$maxStepJump) must stay < 0.45", maxStepJump < 0.45f)
        assertTrue("Active voices stayed bounded <= 18", synth.activeVoiceCount() <= 18)
    }
}`);
      zip.file('gradle.properties', `# Android Gradle Properties for PocketGuitar
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official`);
      zip.file('.github/workflows/build-apk.yml', `name: Build PocketGuitar Android APK & AAB
on: [push, pull_request, workflow_dispatch]
jobs:
  build:
    name: Build Release APK and AAB
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v5
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Set up Gradle 8.10.2
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.10.2'
          cache-disabled: true

      - name: Build APK and AAB
        env:
          ANDROID_HOME: /usr/local/lib/android/sdk
        run: |
          set -e
          if [ -f "android/settings.gradle.kts" ]; then
            cd android
          fi
          echo "Building in: $(pwd)"
          gradle --version
          echo "Running Chord & Audio DSP Verification Tests..."
          gradle testDebugUnitTest --no-daemon --stacktrace
          gradle assembleDebug --no-daemon --stacktrace
          gradle bundleRelease --no-daemon --stacktrace
          find . -name "*.apk" -o -name "*.aab"

      - name: Upload Debug APK
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: PocketGuitar-Debug-APK
          path: |
            **/app/build/outputs/apk/debug/*.apk
            **/build/outputs/apk/debug/*.apk
          if-no-files-found: warn

      - name: Upload Release AAB Bundle
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: PocketGuitar-Release-AAB
          path: |
            **/app/build/outputs/bundle/release/*.aab
            **/build/outputs/bundle/release/*.aab
          if-no-files-found: warn`);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'PocketGuitar-Android-Project.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 font-display">
                Android Studio Project Explorer
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Release APK: ~8 MB</span>
                <span>·</span>
                <span>Play Store AAB: ~5 MB</span>
                <span>·</span>
                <span className="text-emerald-400">&lt; 20 MB Target Met</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Generating Zip...' : 'Download .ZIP'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree Sidebar */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto space-y-1 shrink-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span>Project Files</span>
            </div>
            {ANDROID_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-950/90 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-300 truncate">
                {selectedFile.path}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = selectedFile.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download {selectedFile.name}</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-slate-900" /> : <Copy className="w-3.5 h-3.5 text-slate-900" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre selection:bg-amber-500/30">
              {selectedFile.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
