import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";

/**
 * Saves a jsPDF instance to the device.
 */
export async function savePdf(pdf: any, fileName: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      // Use blob instead of datauristring for better memory management
      const blob = pdf.output("blob");
      
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Request storage permissions
      await Filesystem.requestPermissions();

      const result = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Documents,
        recursive: true
      });

      console.log("File written to:", result.uri);

      // Show notification
      try {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display === "granted") {
          await LocalNotifications.schedule({
            notifications: [
              {
                title: "تم حفظ الملف بنجاح",
                body: `الملف ${fileName} موجود الآن في مستندات الهاتف.`,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: new Date(Date.now() + 500) },
                extra: { uri: result.uri },
              },
            ],
          });
        }
      } catch (notifyError) {
        console.error("Failed to show notification:", notifyError);
      }
      
      return result.uri;
    } catch (error) {
      console.error("Error saving PDF natively:", error);
      throw error;
    }
  } else {
    // Browser environment
    pdf.save(fileName);
  }
}

/**
 * Shares a PDF file.
 */
export async function sharePdf(pdf: any, fileName: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      const blob = pdf.output("blob");
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const writeResult = await Filesystem.writeFile({
        path: `shared-${fileName}`,
        data: pdfBase64,
        directory: Directory.Cache
      });

      await Share.share({
        title: fileName,
        text: "PS1 Operational Report",
        url: writeResult.uri,
        dialogTitle: "Share PDF"
      });
    } catch (error) {
      console.error("Error sharing PDF natively:", error);
    }
  } else {
    try {
      const blob = pdf.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: "PS1 Operational Report"
        });
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error("Error sharing PDF on web:", error);
      pdf.save(fileName);
    }
  }
}

/**
 * Downloads a file from a URL.
 */
export async function downloadUrl(url: string, fileName: string) {
  const absoluteUrl = url.startsWith("http") 
    ? url 
    : new URL(url, window.location.origin).href;

  console.log("Attempting to download:", absoluteUrl);

  if (Capacitor.isNativePlatform()) {
    try {
      const response = await fetch(absoluteUrl);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
        recursive: true
      });

      try {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display === "granted") {
          await LocalNotifications.schedule({
            notifications: [
              {
                title: "تم التحميل بنجاح",
                body: `تم تحميل ${fileName}.`,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: new Date(Date.now() + 500) },
              },
            ],
          });
        }
      } catch (e) {}
      
      return result.uri;
    } catch (error: any) {
      console.error("Native download failed:", error);
      // Last resort: open in browser
      window.open(absoluteUrl, "_blank");
    }
  } else {
    try {
      const response = await fetch(absoluteUrl);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 200);
    } catch (error) {
      console.error("Web fetch download failed:", error);
      // Fallback for simple link
      const a = document.createElement("a");
      a.href = absoluteUrl;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}
