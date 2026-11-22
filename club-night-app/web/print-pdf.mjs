import { jsPDF } from "jspdf";
import { schedulePool } from "./engine.mjs";

const width = 1240;
const height = 1754;
const margin = 64;
const labelWidth = 145;
const bodyTop = 230;

function font(context, size, weight = "normal") {
  context.font = weight + " " + size + "px sans-serif";
}

function wrap(context, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? line + " " + word : word;
    if (context.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const letter of word) {
      if (line && context.measureText(line + letter).width > maxWidth) {
        lines.push(line);
        line = "";
      }
      line += letter;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function layout(context, pool) {
  const rounds = schedulePool(pool.players, pool.boards);
  const contentWidth = width - margin * 2;
  for (let size = 26; size >= 14; size -= 2) {
    font(context, size);
    const lineHeight = Math.ceil(size * 1.3);
    const names = wrap(context, pool.players.join("  ·  "), contentWidth);
    const rows = rounds.map(round => round.flatMap(([a, b]) =>
      wrap(context, a + " mod " + b, contentWidth - labelWidth)
    ));
    const used = names.length * lineHeight + 42 +
      rows.reduce((total, lines) => total + lines.length * lineHeight + 16, 0);
    const scale = Math.min(1, (height - margin - bodyTop) / used);
    if (scale === 1 || size === 14) return {size, lineHeight, names, rows, scale};
  }
}

function paintPage(context, club, pool) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  const {size, lineHeight, names, rows, scale} = layout(context, pool);
  context.textBaseline = "top";
  context.fillStyle = "#25473a";
  font(context, 26, "bold");
  context.fillText(club, margin, 53, width - margin * 2);
  context.fillStyle = "#18251e";
  font(context, 54, "bold");
  context.fillText("Pulje " + pool.id, margin, 91);
  font(context, 28, "bold");
  context.fillText("Spillere", margin, 184);

  context.save();
  context.translate(margin, bodyTop);
  context.scale(scale, scale);
  let y = 0;
  font(context, size);
  for (const line of names) {
    context.fillText(line, 0, y);
    y += lineHeight;
  }
  y += 42;
  rows.forEach((lines, index) => {
    context.fillStyle = "#c5d3ca";
    context.fillRect(0, y - 8, width - margin * 2, 1);
    context.fillStyle = "#25473a";
    font(context, size, "bold");
    context.fillText("Runde " + (index + 1), 0, y);
    font(context, size);
    context.fillStyle = "#18251e";
    for (const line of lines) {
      context.fillText(line, labelWidth, y);
      y += lineHeight;
    }
    y += 16;
  });
  context.restore();
}

export function makePrintPdf(plan, createCanvas = () => document.createElement("canvas")) {
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Kunne ikke gøre PDF’en klar.");
  const pdf = new jsPDF({orientation: "portrait", unit: "mm", format: "a4", compress: true});
  pdf.setProperties({title: plan.club + " – Kampprogram"});
  plan.pools.forEach((pool, index) => {
    if (index) pdf.addPage("a4", "portrait");
    paintPage(context, plan.club, pool);
    pdf.addImage(canvas.toDataURL("image/jpeg", .94), "JPEG", 0, 0, 210, 297, pool.id);
  });
  return pdf.output("arraybuffer");
}
