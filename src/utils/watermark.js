export async function addWatermarkToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(img, 0, 0);

      const padding = Math.max(img.width, img.height) * 0.015;
      const fontSize = Math.max(img.width, img.height) * 0.032;
      ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      const text = "Verified by DC";
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const boxPad = fontSize * 0.4;
      const bx = canvas.width - padding - textWidth - boxPad * 2;
      const by = canvas.height - padding - textHeight - boxPad * 2;

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.roundRect(bx, by, textWidth + boxPad * 2, textHeight + boxPad * 2, fontSize * 0.2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 3;
      ctx.fillText(text, canvas.width - padding - boxPad, canvas.height - padding - boxPad);

      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
          const watermarked = new File([blob], file.name, { type: "image/jpeg" });
          resolve(watermarked);
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}
