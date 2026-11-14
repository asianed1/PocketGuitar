package com.pocketguitar.engine

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
}