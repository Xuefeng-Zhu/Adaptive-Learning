import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await extractText(new Uint8Array(arrayBuffer));
    const text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text;

    return NextResponse.json({ text });
  } catch (err) {
    console.error('PDF extraction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to extract PDF text' },
      { status: 500 }
    );
  }
}
