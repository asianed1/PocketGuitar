package com.pocketguitar

import com.pocketguitar.audio.KarplusSynth
import com.pocketguitar.model.ChordDatabase
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt

class ChordAndAudioVerificationTest {

    private fun freqToMidiRounded(freq: Float): Int {
        return (69.0 + 12.0 * (ln(freq.toDouble() / 440.0) / ln(2.0))).roundToInt()
    }

    private fun pitchClassesForChord(name: String, capo: Int = 0): Set<String> {
        val chord = ChordDatabase.getChord(name) ?: error("Missing chord: $name")
        return chord.getFrequencies(capo)
            .filter { it > 20f }
            .map { freq -> ChordDatabase.NOTE_NAMES[freqToMidiRounded(freq) % 12] }
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

        // Verify Capo 2 shifts C -> D notes and Bb -> C notes
        assertEquals(setOf("D", "F#", "A"), pitchClassesForChord("C", capo = 2))
        assertEquals(setOf("C", "E", "G"), pitchClassesForChord("Bb", capo = 2))

        // Verify every chord in the database has >= 3 sounding strings and valid frequencies
        assertTrue(ChordDatabase.CHORDS.size >= 40)
        ChordDatabase.CHORDS.forEach { (key, chord) ->
            val freqs = chord.getFrequencies(0)
            assertEquals("Chord $key must have 6 string entries", 6, freqs.size)
            val sounding = freqs.count { it > 20f }
            assertTrue("Chord $key must sound >= 3 strings, got $sounding", sounding >= 3)
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
        val totalSamples = sampleRate / 2 // 0.5 seconds
        val rendered = FloatArray(totalSamples)
        var offset = 0
        while (offset < totalSamples) {
            synth.renderFloatBlock(block, blockSize)
            val copyLen = minOf(blockSize, totalSamples - offset)
            System.arraycopy(block, 0, rendered, offset, copyLen)
            offset += copyLen
        }

        // Autocorrelate steady periodic window [0.08s .. 0.28s]
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
        val testFreqs = listOf(
            82.407f,  // E2 low open string
            116.541f, // Bb2 / A#2
            195.998f, // G3
            329.628f, // E4 high open string
            659.255f  // E5 (high string with Capo +7 on D/Em shapes)
        )

        for (rate in testRates) {
            for (freq in testFreqs) {
                val centsErr = measurePitchCentsError(rate, freq)
                assertTrue(
                    "Pitch error at ${rate}Hz for ${freq}Hz was ${"%.2f".format(centsErr)} cents (expected < 3.0)",
                    centsErr < 3.0
                )
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

        // Simulate pressing and holding 6 chords consecutively (each for ~350ms, then 45ms lift damp)
        for ((idx, chordName) in progression.withIndex()) {
            val chord = ChordDatabase.getChord(chordName)!!
            val freqs = chord.getFrequencies(capo = 0)

            // Press chord (damp prior + pluck all sounding strings staggered like a strum)
            synth.dampAll(dampMs = 25f)
            for (s in 0 until 6) {
                if (freqs[s] > 20f) {
                    synth.pluckString(freqs[s], velocity = 0.92f, stringIndex = s, seed = 100 + idx * 10 + s)
                }
                // Render ~14ms between string plucks (1 block ~= 10.6ms)
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

            // Hold for ~250ms
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

            // Finger release: 45ms smooth damp + wait 64ms before next chord
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

            // Verify chord decayed smoothly below audible floor before next finger touch
            var tailEnergy = 0.0
            for (i in 0 until blockSize) {
                tailEnergy += block[i] * block[i]
            }
            val tailRms = sqrt(tailEnergy / blockSize)
            assertTrue("Chord $chordName tail RMS ($tailRms) should decay < 0.01 before next chord", tailRms < 0.01)
        }

        val dcMean = abs(sum / totalSamples)
        assertTrue("Max waveform peak ($maxPeak) must stay strictly below 0.92 (no clipping)", maxPeak <= 0.92f)
        assertTrue("DC offset mean ($dcMean) must remain < 0.005", dcMean < 0.005)
        assertTrue("Max sample-to-sample jump ($maxStepJump) must stay smooth (< 0.45)", maxStepJump < 0.45f)
        assertTrue("Active voices stayed bounded <= 18", synth.activeVoiceCount() <= 18)
    }
}
