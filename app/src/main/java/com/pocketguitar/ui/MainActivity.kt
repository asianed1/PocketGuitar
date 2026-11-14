package com.pocketguitar.ui

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
import com.pocketguitar.model.ChordDatabase
import com.pocketguitar.ui.components.ChordDiagram
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel

class MainActivity : ComponentActivity() {

    private lateinit var audioEngine: AudioEngine
    private lateinit var strumRunner: StrumLoopRunner
    private val appScope = CoroutineScope(Dispatchers.Default)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep phone screen awake while playing so it does not turn off mid-song
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
                PocketGuitarApp(
                    audioEngine = audioEngine,
                    strumRunner = strumRunner
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        strumRunner.stop()
        audioEngine.release()
        appScope.cancel()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PocketGuitarApp(
    audioEngine: AudioEngine,
    strumRunner: StrumLoopRunner
) {
    var isPerformanceMode by remember { mutableStateOf(false) }
    var selectedChordNames by remember {
        mutableStateOf(listOf("C", "G", "Am", "F"))
    }
    var currentStyle by remember { mutableStateOf(StrumPatterns.STYLES[0]) }
    var bpm by remember { mutableIntStateOf(110) }
    var capo by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    Scaffold(
        containerColor = Color(0xFF090D16),
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "PocketGuitar",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 20.sp
                        )
                        if (capo > 0) {
                            Text(
                                text = "Capo $capo",
                                color = Color(0xFFF59E0B),
                                fontSize = 12.sp,
                                modifier = Modifier
                                    .background(Color(0xFF332200), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { isPerformanceMode = !isPerformanceMode }) {
                        Icon(
                            imageVector = if (isPerformanceMode) Icons.Default.Settings else Icons.Default.PlayArrow,
                            contentDescription = "Toggle Screen",
                            tint = Color(0xFFF59E0B)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            AnimatedContent(
                targetState = isPerformanceMode,
                label = "ScreenSwitch"
            ) { inPlayScreen ->
                if (inPlayScreen) {
                    PerformanceScreen(
                        chordNames = selectedChordNames,
                        style = currentStyle,
                        bpm = bpm,
                        capo = capo,
                        audioEngine = audioEngine,
                        strumRunner = strumRunner
                    )
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
    var selectedQuality by remember { mutableStateOf("") } // "" = Major

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

    val candidateChord = "$selectedRoot$selectedQuality"
    val isCandidateValid = ChordDatabase.getChord(candidateChord) != null
    val isCandidateAlreadyIn = selectedChords.contains(candidateChord)

    // Two-Column Landscape Layout: perfectly fits horizontal phone screens
    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ==========================================
        // LEFT COLUMN: Chord Builder & Active Deck
        // ==========================================
        Column(
            modifier = Modifier
                .weight(1.15f)
                .fillMaxHeight()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Header: Active Chords Deck
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Active Session Chords (${selectedChords.size})",
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

            // Active Chords Badges (with X delete)
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
                                    contentDescription = "Remove $chordName",
                                    tint = Color(0xFFF59E0B),
                                    modifier = Modifier.size(14.dp)
                                )
                            },
                            colors = InputChipDefaults.inputChipColors(
                                selectedContainerColor = Color(0xFF1E293B)
                            ),
                            border = InputChipDefaults.inputChipBorder(
                                enabled = true,
                                selected = true,
                                borderColor = Color(0xFFF59E0B),
                                selectedBorderColor = Color(0xFFF59E0B)
                            )
                        )
                    }
                }
            }

            HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)

            // Chord Builder Section
            Text(
                text = "Chord Builder",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )

            // Step 1: Root Note Selector
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

            // Step 2: Quality Selector
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

            // Add Candidate Chord Button
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
                        isCandidateAlreadyIn -> "$candidateChord is Already in Deck"
                        !isCandidateValid -> "$candidateChord (Not Available)"
                        else -> "+ Add $candidateChord to Session Deck"
                    },
                    color = if (isCandidateValid && !isCandidateAlreadyIn) Color.Black else Color(0xFF94A3B8),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }

            // Quick Comma-Separated Text Input Box
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
                                parseError = "Unknown: ${invalid.joinToString(", ")}"
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

        // ==========================================
        // RIGHT COLUMN: Rhythm, Tempo, Capo & Start
        // ==========================================
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Strumming Style Section
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
                text = "Pattern: ${currentStyle.description}",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp
            )

            HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)

            // Tempo Speed Selector Section (Steppers + Presets + Slider)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Tempo Speed", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("$bpm BPM", color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            // Steppers & Presets
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

            // Capo Transpose Selector (Discrete Tappable Buttons 0..7)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Capo Transpose", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(
                    text = if (capo == 0) "No Capo" else "+$capo Frets",
                    color = Color(0xFFF59E0B),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }

            // Discrete Capo selector buttons: 0, 1, 2, 3, 4, 5, 6, 7
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
                                text = if (fret == 0) "0" else "+$fret",
                                fontSize = 11.sp,
                                fontWeight = if (capo == fret) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Start Playing Button
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Top status strip
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Style: ${style.name}", color = Color(0xFF94A3B8), fontSize = 12.sp)
            Text("$bpm BPM", color = Color(0xFFF59E0B), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }

        // Touchable Chord Keys Grid (takes up majority of screen)
        val columnCount = when {
            chordNames.size <= 3 -> chordNames.size
            chordNames.size == 4 -> 4
            chordNames.size <= 6 -> 3
            else -> 4
        }
        val rows = chordNames.chunked(columnCount)

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            rows.forEach { rowChords ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
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
                                    if (isHeld) Brush.verticalGradient(
                                        listOf(Color(0xFF78350F), Color(0xFFB45309))
                                    ) else Brush.verticalGradient(
                                        listOf(Color(0xFF1E293B), Color(0xFF0F172A))
                                    )
                                )
                                .border(
                                    width = if (isHeld) 2.dp else 1.dp,
                                    color = if (isHeld) Color(0xFFF59E0B) else Color(0xFF334155),
                                    shape = RoundedCornerShape(14.dp)
                                )
                                .pointerInput(chordName, style, bpm, capo) {
                                    detectTapGestures(
                                        onPress = {
                                            audioEngine.dampAll(dampMs = 25f)
                                            activeChordName = chordName
                                            strumRunner.startHoldingChord(chord, style, bpm, capo)
                                            val released = tryAwaitRelease()
                                            strumRunner.stop()
                                            if (released) {
                                                audioEngine.dampAll(dampMs = 45f)
                                            }
                                            activeChordName = null
                                        }
                                    )
                                }
                                .pointerInput(chordName, capo) {
                                    var lastSwipeMs = 0L
                                    detectDragGestures { change, dragAmount ->
                                        change.consume()
                                        val now = System.currentTimeMillis()
                                        if (now - lastSwipeMs < 90L) return@detectDragGestures
                                        if (dragAmount.y > 15f) {
                                            lastSwipeMs = now
                                            // Downstrum
                                            audioEngine.strumChord(
                                                chord.getFrequencies(capo),
                                                isDownstrum = true,
                                                velocity = 0.9f,
                                                scope = scope
                                            )
                                        } else if (dragAmount.y < -15f) {
                                            lastSwipeMs = now
                                            // Upstrum
                                            audioEngine.strumChord(
                                                chord.getFrequencies(capo),
                                                isDownstrum = false,
                                                velocity = 0.85f,
                                                scope = scope
                                            )
                                        }
                                    }
                                }
                                .padding(8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxHeight()
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = chordName,
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White
                                    )
                                    if (capo > 0) {
                                        Text(
                                            text = "($soundingName)",
                                            fontSize = 11.sp,
                                            color = Color(0xFFF59E0B)
                                        )
                                    }
                                }

                                // 6-String Chord Diagram
                                ChordDiagram(
                                    chord = chord,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .weight(1f)
                                )

                                Text(
                                    text = "HOLD OR SWIPE",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isHeld) Color(0xFFFDE68A) else Color(0xFF64748B)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Dedicated Palm Mute Bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFF7F1D1D))
                .border(1.5.dp, Color(0xFFEF4444), RoundedCornerShape(12.dp))
                .clickable {
                    audioEngine.palmMute()
                },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "PALM MUTE BAR (TAP TO STOP SOUND)",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}
