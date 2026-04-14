import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const site = searchParams.get('site');

  let query = supabase.from('receipts').select('*, receipt_lots(*)').order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (site && site !== 'all') {
    query = query.eq('lotissement_name', site);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();

  // Generate receipt number
  const { data: receiptNum } = await supabase.rpc('generate_receipt_number');

  const receiptData = {
    ...body,
    receipt_number: receiptNum || `WFI-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  };

  const { data, error } = await supabase
    .from('receipts')
    .insert(receiptData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
