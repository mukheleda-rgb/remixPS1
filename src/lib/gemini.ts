export interface ExtractedData {
  hour?: string;
  levels: Record<string, number | null>;
}

export async function analyzeControlScreen(args: { data: { base64Image: string, mimeType: string } }): Promise<ExtractedData> {
  const { data: { base64Image, mimeType } } = args;
  
  const response = await fetch("/api/analyze-screen", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ base64Image, mimeType }),
  });

  if (!response.ok) {
    let errMsg = `Failed to analyze image (Status: ${response.status})`;
    try {
      const err = await response.json();
      errMsg = err.error || errMsg;
      if (errMsg && (errMsg.includes("GEMINI_API_KEY") || errMsg.includes("not set"))) {
        errMsg = "عذرًا، ميزة الرؤية والذكاء الاصطناعي تتطلب مفتاح تفعيل (GEMINI_API_KEY). يرجى الانتقال إلى الإعدادات ⚙️ -> الأسرار (Secrets) وإدخال المفتاح لتنشيط قراءة شاشات التحكم تلقائيًا.";
      }
    } catch (e) {
      // Non-JSON response (e.g., HTML fallback or server error page)
    }
    throw new Error(errMsg);
  }

  try {
    return await response.json();
  } catch (parseError) {
    throw new Error("Invalid response format received from server. Please try again.");
  }
}
