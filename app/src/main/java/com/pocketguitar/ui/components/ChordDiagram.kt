package com.pocketguitar.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pocketguitar.model.Chord

/** Draws a six-string guitar chord diagram with muted/open strings and finger positions. */
@Composable
fun ChordDiagram(
    chord: Chord,
    modifier: Modifier = Modifier.size(width = 110.dp, height = 130.dp),
    primaryColor: Color = Color(0xFFF59E0B),
    lineColor: Color = Color(0xFF94A3B8),
    textColor: Color = Color(0xFFE2E8F0)
) {
    val textMeasurer = rememberTextMeasurer()

    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val topMargin = height * 0.18f
        val bottomMargin = height * 0.1f
        val leftMargin = width * 0.18f
        val rightMargin = width * 0.82f
        val gridWidth = rightMargin - leftMargin
        val gridHeight = height - topMargin - bottomMargin
        val numFrets = 4
        val fretSpacing = gridHeight / numFrets
        val stringSpacing = gridWidth / 5f

        drawLine(
            color = textColor,
            start = Offset(leftMargin - 2f, topMargin),
            end = Offset(rightMargin + 2f, topMargin),
            strokeWidth = 6f
        )

        for (fret in 1..numFrets) {
            val y = topMargin + fret * fretSpacing
            drawLine(
                color = lineColor.copy(alpha = 0.5f),
                start = Offset(leftMargin, y),
                end = Offset(rightMargin, y),
                strokeWidth = 2f
            )
        }

        for (string in 0..5) {
            val x = leftMargin + string * stringSpacing
            drawLine(
                color = lineColor,
                start = Offset(x, topMargin),
                end = Offset(x, height - bottomMargin),
                strokeWidth = (3.5f - string * 0.45f).coerceAtLeast(1.2f)
            )
        }

        for (string in 0..5) {
            val fret = chord.frets[string]
            val x = leftMargin + string * stringSpacing
            val y = topMargin * 0.55f

            when {
                fret < 0 -> {
                    val xSize = 5f
                    drawLine(
                        color = Color(0xFFEF4444),
                        start = Offset(x - xSize, y - xSize),
                        end = Offset(x + xSize, y + xSize),
                        strokeWidth = 2.5f
                    )
                    drawLine(
                        color = Color(0xFFEF4444),
                        start = Offset(x - xSize, y + xSize),
                        end = Offset(x + xSize, y - xSize),
                        strokeWidth = 2.5f
                    )
                }
                fret == 0 -> drawCircle(
                    color = textColor.copy(alpha = 0.8f),
                    radius = 4.5f,
                    center = Offset(x, y),
                    style = Stroke(width = 2f)
                )
            }
        }

        if (chord.barreFret != null && chord.barreFrom != null) {
            val y = topMargin + (chord.barreFret - 0.5f) * fretSpacing
            val startX = leftMargin + chord.barreFrom * stringSpacing
            drawLine(
                color = primaryColor,
                start = Offset(startX, y),
                end = Offset(rightMargin, y),
                strokeWidth = 14f
            )
        }

        for (string in 0..5) {
            val fret = chord.frets[string]
            if (fret > 0) {
                val x = leftMargin + string * stringSpacing
                val y = topMargin + (fret - 0.5f) * fretSpacing
                drawCircle(
                    color = primaryColor,
                    radius = 8.5f,
                    center = Offset(x, y)
                )

                val finger = chord.fingers[string]
                if (finger in 1..4) {
                    val style = TextStyle(color = Color.Black, fontSize = 9.sp)
                    val measured = textMeasurer.measure(finger.toString(), style = style)
                    drawText(
                        textMeasurer = textMeasurer,
                        text = finger.toString(),
                        topLeft = Offset(
                            x - measured.size.width / 2f,
                            y - measured.size.height / 2f
                        ),
                        style = style
                    )
                }
            }
        }
    }
}
