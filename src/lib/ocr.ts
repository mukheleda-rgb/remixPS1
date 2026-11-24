import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// Ensure worker is set up for PDF.js (use same version as in DiagramPdfViewer if possible)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface OCRResult {
  hour?: string;
  levels: Record<string, number | null>;
}

const TANK_KEYS = ["B1", "B2", "K1", "K2", "K3", "K4", "R1", "R2", "R3", "R4"];

export async function extractDataViaOCR(file: File): Promise<OCRResult> {
  const worker = await createWorker("eng");
  
  try {
    let source: any = file;

    // Handle PDF by rendering first page to canvas
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context!, viewport }).promise;
      source = canvas.toDataURL("image/png");
    }

    const { data: { text } } = await worker.recognize(source);
    console.log("OCR Extracted Text:", text);

    const levels: Record<string, number | null> = {};
    TANK_KEYS.forEach(k => levels[k] = null);

    // Basic parsing logic:
    // We look for patterns like "B1: 123.4" or "B1 123"
    // We'll split by lines and spaces
    const tokens = text.split(/[\s\n:]+/);
    
    for (let i = 0; i < tokens.length; i++) {
       const token = tokens[i].toUpperCase().trim();
       if (TANK_KEYS.includes(token)) {
         // Check next few tokens for a number
         for (let j = 1; j <= 2; j++) {
           const nextToken = tokens[i + j];
           if (nextToken) {
             const num = parseFloat(nextToken.replace(/[^0-9.]/g, ''));
             if (!isNaN(num)) {
               levels[token] = num;
               break;
             }
           }
         }
       }
    }

    // Try to find hour (pattern HH:mm)
    const hourMatch = text.match(/([01]?[0-9]|2[0-3]):([0-5][0-9])/);
    const hour = hourMatch ? hourMatch[0] : undefined;

    return { hour, levels };
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  } finally {
    await worker.terminate();
  }
}
