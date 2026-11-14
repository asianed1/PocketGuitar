package com.pocketguitar.audio

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.max
import kotlin.random.Random

/**
 * Pure-Kotlin, zero-allocation Karplus-Strong physical acoustic guitar synthesizer.
 *
 * Key design guarantees:
 * 1. Zero heap allocations inside renderBlock() (no iterators, no per-pluck arrays) -> zero GC pauses.
 * 2. Fixed 18-voice pool with per-string re-pluck damping -> prevents polyphony explosion.
 * 3. Fractional-delay linear interpolation + 0.5-sample averaging lag compensation -> < 1 cent pitch accuracy.
 * 4. Exact DC-mean removal on noise excitation + output 1-pole DC blocker -> zero DC drift.
 * 5. Instant-attack / smooth-release peak limiter -> mathematically clip-free across rapid chord switches.
 */
class KarplusSynth(
    val sampleRate: Int = 44100,
    maxVoices: Int = 18
) {
    companion object {
        private const val DELAY_BUF_SIZE = 4096 // Power of 2 for bitmask wrapping
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

    // Output 1-pole DC blocker state
    private var dcPrevIn = 0f
    private var dcPrevOut = 0f

    // Smooth peak-limiter envelope follower
    private var envPeak = 0f
    private val envReleaseCoeff = exp(-1.0 / (sampleRate * 0.040)).toFloat() // ~40ms release

    fun pluckString(
        freq: Float,
        velocity: Float = 0.8f,
        stringIndex: Int = -1,
        seed: Int? = null
    ) {
        if (freq <= 20f || freq >= sampleRate * 0.45f) return

        // Gently damp any older ringing voice on the same physical string so strumming
        // the same chord repeatedly never stacks duplicate copies of the same string.
        if (stringIndex in 0..5) {
            for (slot in slots) {
                if (slot.active && slot.stringIndex == stringIndex && !slot.isDamping) {
                    startDamp(slot, dampMs = 14f)
                }
            }
        }

        val slot = acquireSlot()
        val rng = if (seed != null) Random(seed) else Random.Default

        // Karplus-Strong (a + b) * 0.5 filter adds 0.5 samples of phase lag; compensate before truncation.
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

        // Remove exact DC mean so low-pass averaging cannot sustain a DC offset
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

    /**
     * Smoothly fades out all active voices over [dampMs] milliseconds (no click/pop).
     */
    fun dampAll(dampMs: Float = 40f) {
        for (slot in slots) {
            if (slot.active) {
                startDamp(slot, dampMs)
            }
        }
    }

    fun clearImmediate() {
        for (slot in slots) {
            slot.active = false
        }
        dcPrevIn = 0f
        dcPrevOut = 0f
        envPeak = 0f
    }

    fun activeVoiceCount(): Int {
        var count = 0
        for (slot in slots) {
            if (slot.active) count++
        }
        return count
    }

    private fun startDamp(slot: VoiceSlot, dampMs: Float) {
        val dampSamples = max(16f, sampleRate * (dampMs / 1000f))
        // Target -60 dB (0.001) across dampSamples -> exp(ln(0.001) / N)
        val coeff = exp(-6.907755 / dampSamples).toFloat()
        slot.dampCoeff = if (slot.isDamping) minOf(slot.dampCoeff, coeff) else coeff
        slot.isDamping = true
    }

    private fun acquireSlot(): VoiceSlot {
        for (slot in slots) {
            if (!slot.active) return slot
        }
        // Prefer stealing a voice that is already damping, otherwise steal the oldest voice
        var bestSlot = slots[0]
        for (i in 1 until slots.size) {
            val candidate = slots[i]
            val candidatePriority = if (candidate.isDamping && !bestSlot.isDamping) true
            else if (candidate.isDamping == bestSlot.isDamping && candidate.ageOrder < bestSlot.ageOrder) true
            else false
            if (candidatePriority) {
                bestSlot = candidate
            }
        }
        return bestSlot
    }

    /**
     * Renders [numFrames] mono float samples in [-1.0, 1.0] into [outFloat].
     */
    fun renderFloatBlock(outFloat: FloatArray, numFrames: Int) {
        outFloat.fill(0f, 0, numFrames)

        // Block-by-block per voice for CPU cache locality
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

                if (isDamping) {
                    gain *= dampCoeff
                }

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

        // DC blocker + instant-attack/smooth-release peak limiter
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
}
