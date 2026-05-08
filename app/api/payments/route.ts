import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { numberToWordsFr } from '@/lib/utils/numberToWords';

// GET /api/payments?receipt_id=xxx — liste les versements d'un reçu
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const receiptId = searchParams.get('receipt_id');

  if (!receiptId) {
    return NextResponse.json({ error: 'receipt_id requis' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*, created_by_profile:profiles(full_name)')
    .eq('receipt_id', receiptId)
    .order('payment_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/payments — créer un versement
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();
  const { receipt_id, payment_date, amount, payment_method, reference, notes } = body;

  if (!receipt_id || !amount || !payment_date) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }

  // Vérifier que le reçu existe et n'est pas annulé
  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .select('id, status, amount_due, total_amount')
    .eq('id', receipt_id)
    .single();

  if (receiptError || !receipt) {
    return NextResponse.json({ error: 'Reçu introuvable' }, { status: 404 });
  }

  if (receipt.status === 'annulé') {
    return NextResponse.json({ error: 'Impossible d\'ajouter un versement sur un reçu annulé' }, { status: 400 });
  }

  if (Number(amount) > Number(receipt.amount_due)) {
    return NextResponse.json({
      error: `Le versement (${amount} FCFA) dépasse le reste dû (${receipt.amount_due} FCFA)`
    }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('payments')
    .insert({
      receipt_id,
      payment_date,
      amount: Number(amount),
      amount_words: numberToWordsFr(Number(amount)),
      payment_method: payment_method || 'espèces',
      reference: reference || null,
      notes: notes || null,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/payments?id=xxx — supprimer un versement (admin only)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  // Vérifier que l'utilisateur est admin
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}