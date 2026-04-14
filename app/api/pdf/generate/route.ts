import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { receiptId } = await request.json();

  // Fetch receipt with lots
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (error || !receipt) {
    return NextResponse.json({ error: 'Reçu introuvable' }, { status: 404 });
  }

  const { data: lots } = await supabase
    .from('receipt_lots')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('display_order');

  // For now, return a placeholder URL.
  // In production, use @react-pdf/renderer on the server to generate the PDF
  // and upload to Supabase Storage.
  // React-PDF server rendering requires a separate worker setup.

  // Placeholder: store receipt data as PDF metadata
  const serviceClient = await createServiceClient();

  const pdfFileName = `recus/recu-${receipt.receipt_number}.json`;

  // Store receipt data in storage for client-side PDF generation
  const receiptData = JSON.stringify({ receipt, lots: lots || [] });
  const { error: uploadError } = await serviceClient.storage
    .from('receipts')
    .upload(pdfFileName, receiptData, {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    // Non-blocking — PDF URL will be empty
    return NextResponse.json({ pdf_url: null });
  }

  const { data: urlData } = serviceClient.storage
    .from('receipts')
    .getPublicUrl(pdfFileName);

  return NextResponse.json({ pdf_url: urlData.publicUrl });
}
