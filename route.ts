export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // pdf2json is CommonJS
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFParser = require("pdf2json");

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const text: string = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(errData?.parserError || new Error("Failed to parse PDF"));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          const pages = pdfData?.Pages || [];
          const out = pages
            .map((p: any) =>
              (p.Texts || [])
                .map((t: any) =>
                  (t.R || [])
                    .map((r: any) => decodeURIComponent(r.T || ""))
                    .join("")
                )
                .join(" ")
            )
            .join("\n");

          resolve(out);
        } catch (e) {
          reject(e);
        }
      });

      pdfParser.parseBuffer(buffer);
    });

    return Response.json({ text });
  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Failed to extract text" },
      { status: 500 }
    );
  }
}
