package com.pocketguitar.audio

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
 *
 * Uses device-native hardware sample rate (typically 48 kHz) via AudioManager when available,
 * zero-allocation block rendering on a dedicated URGENT_AUDIO thread, and smooth chord-switch
 * damping so rapid chord changes never stack voices, clip, or underrun.
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
                    // Track stopped or dead; avoid spinning tightly
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
                    if (orderIndex > 0 && interStringDelayMs > 0) {
                        delay(interStringDelayMs)
                    }
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

    /**
     * Smoothly fades out currently ringing strings (e.g. when lifting off a chord).
     */
    fun dampAll(dampMs: Float = 45f) {
        activeStrumJob?.cancel()
        synchronized(synthLock) {
            synth.dampAll(dampMs)
        }
    }

    /**
     * Palm mute bar: fast ~20ms acoustic choke with zero hard-cut pop.
     */
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
}
