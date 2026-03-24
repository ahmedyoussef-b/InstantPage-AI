import { NextResponse } from 'next/server';
import { fileService } from '@/lib/document-manager/file-service';

export async function GET() {
  try {
    const tree = await fileService.getTree();
    return NextResponse.json({ tree });
  } catch (error) {
    console.error('[API][TREE] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
