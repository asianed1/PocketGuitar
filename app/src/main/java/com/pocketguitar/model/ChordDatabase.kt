package com.pocketguitar.model

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
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as Chord
        return name == other.name && frets.contentEquals(other.frets)
    }

    override fun hashCode(): Int {
        var result = name.hashCode()
        result = 31 * result + frets.contentHashCode()
        return result
    }

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
        // C Chords
        "C" to Chord("C", "C", "Major", intArrayOf(-1, 3, 2, 0, 1, 0), intArrayOf(0, 3, 2, 0, 1, 0)),
        "Cm" to Chord("Cm", "C", "Minor", intArrayOf(-1, 3, 5, 5, 4, 3), intArrayOf(0, 1, 3, 4, 2, 1), 3, 1),
        "C7" to Chord("C7", "C", "7", intArrayOf(-1, 3, 2, 3, 1, 0), intArrayOf(0, 3, 2, 4, 1, 0)),
        "Cmaj7" to Chord("Cmaj7", "C", "maj7", intArrayOf(-1, 3, 2, 0, 0, 0), intArrayOf(0, 3, 2, 0, 0, 0)),
        "Cm7" to Chord("Cm7", "C", "m7", intArrayOf(-1, 3, 5, 3, 4, 3), intArrayOf(0, 1, 3, 1, 2, 1), 3, 1),
        "Csus4" to Chord("Csus4", "C", "sus4", intArrayOf(-1, 3, 3, 0, 1, 1), intArrayOf(0, 3, 4, 0, 1, 1)),
        "Cadd9" to Chord("Cadd9", "C", "add9", intArrayOf(-1, 3, 2, 0, 3, 3), intArrayOf(0, 2, 1, 0, 3, 4)),

        // C# / Db Chords
        "C#" to Chord("C#", "C#", "Major", intArrayOf(-1, 4, 6, 6, 6, 4), intArrayOf(0, 1, 2, 3, 4, 1), 4, 1),
        "C#m" to Chord("C#m", "C#", "Minor", intArrayOf(-1, 4, 6, 6, 5, 4), intArrayOf(0, 1, 3, 4, 2, 1), 4, 1),
        "C#7" to Chord("C#7", "C#", "7", intArrayOf(-1, 4, 6, 4, 6, 4), intArrayOf(0, 1, 3, 1, 4, 1), 4, 1),

        // D Chords
        "D" to Chord("D", "D", "Major", intArrayOf(-1, -1, 0, 2, 3, 2), intArrayOf(0, 0, 0, 1, 3, 2)),
        "Dm" to Chord("Dm", "D", "Minor", intArrayOf(-1, -1, 0, 2, 3, 1), intArrayOf(0, 0, 0, 2, 3, 1)),
        "D7" to Chord("D7", "D", "7", intArrayOf(-1, -1, 0, 2, 1, 2), intArrayOf(0, 0, 0, 2, 1, 3)),
        "Dmaj7" to Chord("Dmaj7", "D", "maj7", intArrayOf(-1, -1, 0, 2, 2, 2), intArrayOf(0, 0, 0, 1, 2, 3)),
        "Dm7" to Chord("Dm7", "D", "m7", intArrayOf(-1, -1, 0, 2, 1, 1), intArrayOf(0, 0, 0, 2, 1, 1), 1, 4),
        "Dsus4" to Chord("Dsus4", "D", "sus4", intArrayOf(-1, -1, 0, 2, 3, 3), intArrayOf(0, 0, 0, 1, 3, 4)),

        // D# / Eb Chords
        "D#" to Chord("D#", "D#", "Major", intArrayOf(-1, 6, 8, 8, 8, 6), intArrayOf(0, 1, 2, 3, 4, 1), 6, 1),
        "Eb" to Chord("Eb", "D#", "Major", intArrayOf(-1, 6, 8, 8, 8, 6), intArrayOf(0, 1, 2, 3, 4, 1), 6, 1),
        "Ebm" to Chord("Ebm", "D#", "Minor", intArrayOf(-1, 6, 8, 8, 7, 6), intArrayOf(0, 1, 3, 4, 2, 1), 6, 1),
        "Eb7" to Chord("Eb7", "D#", "7", intArrayOf(-1, 6, 8, 6, 8, 6), intArrayOf(0, 1, 3, 1, 4, 1), 6, 1),

        // E Chords
        "E" to Chord("E", "E", "Major", intArrayOf(0, 2, 2, 1, 0, 0), intArrayOf(0, 2, 3, 1, 0, 0)),
        "Em" to Chord("Em", "E", "Minor", intArrayOf(0, 2, 2, 0, 0, 0), intArrayOf(0, 2, 3, 0, 0, 0)),
        "E7" to Chord("E7", "E", "7", intArrayOf(0, 2, 0, 1, 0, 0), intArrayOf(0, 2, 0, 1, 0, 0)),
        "Emaj7" to Chord("Emaj7", "E", "maj7", intArrayOf(0, 2, 1, 1, 0, 0), intArrayOf(0, 3, 1, 2, 0, 0)),
        "Em7" to Chord("Em7", "E", "m7", intArrayOf(0, 2, 2, 0, 3, 0), intArrayOf(0, 1, 2, 0, 3, 0)),
        "Esus4" to Chord("Esus4", "E", "sus4", intArrayOf(0, 2, 2, 2, 0, 0), intArrayOf(0, 2, 3, 4, 0, 0)),

        // F Chords
        "F" to Chord("F", "F", "Major", intArrayOf(1, 3, 3, 2, 1, 1), intArrayOf(1, 3, 4, 2, 1, 1), 1, 0),
        "Fm" to Chord("Fm", "F", "Minor", intArrayOf(1, 3, 3, 1, 1, 1), intArrayOf(1, 3, 4, 1, 1, 1), 1, 0),
        "F7" to Chord("F7", "F", "7", intArrayOf(1, 3, 1, 2, 1, 1), intArrayOf(1, 3, 1, 2, 1, 1), 1, 0),
        "Fmaj7" to Chord("Fmaj7", "F", "maj7", intArrayOf(-1, -1, 3, 2, 1, 0), intArrayOf(0, 0, 3, 2, 1, 0)),
        "Fsus4" to Chord("Fsus4", "F", "sus4", intArrayOf(1, 3, 3, 3, 1, 1), intArrayOf(1, 2, 3, 4, 1, 1), 1, 0),

        // F# / Gb Chords
        "F#" to Chord("F#", "F#", "Major", intArrayOf(2, 4, 4, 3, 2, 2), intArrayOf(1, 3, 4, 2, 1, 1), 2, 0),
        "F#m" to Chord("F#m", "F#", "Minor", intArrayOf(2, 4, 4, 2, 2, 2), intArrayOf(1, 3, 4, 1, 1, 1), 2, 0),
        "F#7" to Chord("F#7", "F#", "7", intArrayOf(2, 4, 2, 3, 2, 2), intArrayOf(1, 3, 1, 2, 1, 1), 2, 0),
        "F#m7" to Chord("F#m7", "F#", "m7", intArrayOf(2, 4, 2, 2, 2, 2), intArrayOf(1, 3, 1, 1, 1, 1), 2, 0),

        // G Chords
        "G" to Chord("G", "G", "Major", intArrayOf(3, 2, 0, 0, 3, 3), intArrayOf(2, 1, 0, 0, 3, 4)),
        "Gm" to Chord("Gm", "G", "Minor", intArrayOf(3, 5, 5, 3, 3, 3), intArrayOf(1, 3, 4, 1, 1, 1), 3, 0),
        "G7" to Chord("G7", "G", "7", intArrayOf(3, 2, 0, 0, 0, 1), intArrayOf(3, 2, 0, 0, 0, 1)),
        "Gmaj7" to Chord("Gmaj7", "G", "maj7", intArrayOf(3, 2, 0, 0, 0, 2), intArrayOf(2, 1, 0, 0, 0, 3)),
        "Gm7" to Chord("Gm7", "G", "m7", intArrayOf(3, 5, 3, 3, 3, 3), intArrayOf(1, 3, 1, 1, 1, 1), 3, 0),
        "Gsus4" to Chord("Gsus4", "G", "sus4", intArrayOf(3, 3, 0, 0, 1, 3), intArrayOf(2, 3, 0, 0, 1, 4)),

        // G# / Ab Chords
        "G#" to Chord("G#", "G#", "Major", intArrayOf(4, 6, 6, 5, 4, 4), intArrayOf(1, 3, 4, 2, 1, 1), 4, 0),
        "Ab" to Chord("Ab", "G#", "Major", intArrayOf(4, 6, 6, 5, 4, 4), intArrayOf(1, 3, 4, 2, 1, 1), 4, 0),
        "Abm" to Chord("Abm", "G#", "Minor", intArrayOf(4, 6, 6, 4, 4, 4), intArrayOf(1, 3, 4, 1, 1, 1), 4, 0),
        "Ab7" to Chord("Ab7", "G#", "7", intArrayOf(4, 6, 4, 5, 4, 4), intArrayOf(1, 3, 1, 2, 1, 1), 4, 0),

        // A Chords
        "A" to Chord("A", "A", "Major", intArrayOf(-1, 0, 2, 2, 2, 0), intArrayOf(0, 0, 1, 2, 3, 0)),
        "Am" to Chord("Am", "A", "Minor", intArrayOf(-1, 0, 2, 2, 1, 0), intArrayOf(0, 0, 2, 3, 1, 0)),
        "A7" to Chord("A7", "A", "7", intArrayOf(-1, 0, 2, 0, 2, 0), intArrayOf(0, 0, 1, 0, 2, 0)),
        "Amaj7" to Chord("Amaj7", "A", "maj7", intArrayOf(-1, 0, 2, 1, 2, 0), intArrayOf(0, 0, 2, 1, 3, 0)),
        "Am7" to Chord("Am7", "A", "m7", intArrayOf(-1, 0, 2, 0, 1, 0), intArrayOf(0, 0, 2, 0, 1, 0)),
        "Asus4" to Chord("Asus4", "A", "sus4", intArrayOf(-1, 0, 2, 2, 3, 0), intArrayOf(0, 0, 1, 2, 3, 0)),
        "A7sus4" to Chord("A7sus4", "A", "7sus4", intArrayOf(-1, 0, 2, 0, 3, 0), intArrayOf(0, 0, 1, 0, 3, 0)),

        // A# / Bb Chords
        "A#" to Chord("A#", "A#", "Major", intArrayOf(-1, 1, 3, 3, 3, 1), intArrayOf(0, 1, 2, 3, 4, 1), 1, 1),
        "Bb" to Chord("Bb", "A#", "Major", intArrayOf(-1, 1, 3, 3, 3, 1), intArrayOf(0, 1, 2, 3, 4, 1), 1, 1),
        "Bbm" to Chord("Bbm", "A#", "Minor", intArrayOf(-1, 1, 3, 3, 2, 1), intArrayOf(0, 1, 3, 4, 2, 1), 1, 1),
        "Bb7" to Chord("Bb7", "A#", "7", intArrayOf(-1, 1, 3, 1, 3, 1), intArrayOf(0, 1, 3, 1, 4, 1), 1, 1),

        // B Chords
        "B" to Chord("B", "B", "Major", intArrayOf(-1, 2, 4, 4, 4, 2), intArrayOf(0, 1, 2, 3, 4, 1), 2, 1),
        "Bm" to Chord("Bm", "B", "Minor", intArrayOf(-1, 2, 4, 4, 3, 2), intArrayOf(0, 1, 3, 4, 2, 1), 2, 1),
        "B7" to Chord("B7", "B", "7", intArrayOf(-1, 2, 1, 2, 0, 2), intArrayOf(0, 2, 1, 3, 0, 4)),
        "Bm7" to Chord("Bm7", "B", "m7", intArrayOf(-1, 2, 4, 2, 3, 2), intArrayOf(0, 1, 3, 1, 2, 1), 2, 1),
        "Bsus4" to Chord("Bsus4", "B", "sus4", intArrayOf(-1, 2, 4, 4, 5, 2), intArrayOf(0, 1, 2, 3, 4, 1), 2, 1)
    )

    fun getChord(name: String): Chord? {
        val trimmed = name.trim()
        val direct = CHORDS[trimmed] ?: CHORDS[trimmed.replaceFirstChar { it.uppercase() }]
        if (direct != null) return direct

        val enharmonics = mapOf(
            "Db" to "C#", "Gb" to "F#", "Ab" to "G#", "Bb" to "A#", "Eb" to "D#"
        )
        for ((flat, sharp) in enharmonics) {
            if (trimmed.startsWith(flat)) {
                val alias = sharp + trimmed.removePrefix(flat)
                CHORDS[alias]?.let { return it }
            } else if (trimmed.startsWith(sharp)) {
                val alias = flat + trimmed.removePrefix(sharp)
                CHORDS[alias]?.let { return it }
            }
        }
        return null
    }

    fun getSoundingChordName(name: String, capo: Int): String {
        if (capo == 0) return name
        val trimmed = name.trim()
        val chord = getChord(trimmed) ?: return name
        val rootIdx = NOTE_NAMES.indexOf(chord.root)
        if (rootIdx == -1) return name
        val newRoot = NOTE_NAMES[(rootIdx + capo) % 12]

        // Strip root from the chord name itself (handles enharmonic spellings like Bb, Eb, Ab, Db, Gb)
        val rootLen = if (trimmed.length >= 2 && (trimmed[1] == '#' || trimmed[1] == 'b')) 2 else 1
        val suffix = trimmed.drop(rootLen)
        return "$newRoot$suffix"
    }
}
