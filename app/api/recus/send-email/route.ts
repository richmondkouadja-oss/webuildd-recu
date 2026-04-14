import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { receiptId } = await request.json();

  // Fetch receipt
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (error || !receipt) {
    return NextResponse.json({ error: 'Reçu introuvable' }, { status: 404 });
  }

  try {
    const emailResult = await resend.emails.send({
      from: 'WEBUILDD F&I <recus@webuildd.ci>',
      to: [receipt.client_email],
      subject: `Votre reçu de paiement N° ${receipt.receipt_number} — WEBUILDD`,
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #8B1A1A; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">WEBUILDD FONCIER & IMMOBILIER</h1>
            <p style="margin: 5px 0 0; opacity: 0.8;">Reçu de Paiement</p>
          </div>
          <div style="padding: 24px; background: #f9fafb;">
            <p>Bonjour <strong>${receipt.client_name}</strong>,</p>
            <p>Veuillez trouver ci-dessous les détails de votre reçu de paiement :</p>
            <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #E5E7EB;">
              <p><strong>N° Reçu :</strong> ${receipt.receipt_number}</p>
              <p><strong>Date :</strong> ${new Date(receipt.receipt_date).toLocaleDateString('fr-FR')}</p>
              <p><strong>Montant total :</strong> ${new Intl.NumberFormat('fr-FR').format(receipt.total_amount)} FCFA</p>
              <div style="background: #8B1A1A; color: white; border-radius: 8px; padding: 12px; text-align: center; margin: 12px 0;">
                <p style="font-size: 12px; opacity: 0.8; margin: 0;">SOMME VERSÉE</p>
                <p style="font-size: 24px; font-weight: bold; margin: 4px 0;">${new Intl.NumberFormat('fr-FR').format(receipt.amount_paid)} FCFA</p>
              </div>
              <p><em>${receipt.amount_paid_words}</em></p>
              <p><strong>Reste dû :</strong> <span style="color: ${receipt.amount_due > 0 ? '#DC2626' : '#16A34A'};">${new Intl.NumberFormat('fr-FR').format(receipt.amount_due)} FCFA</span></p>
            </div>
            ${receipt.pdf_url ? `<p><a href="${receipt.pdf_url}" style="display: inline-block; background: #8B1A1A; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none;">Télécharger le PDF</a></p>` : ''}
            <p>Cordialement,<br><strong>WEBUILDD FONCIER & IMMOBILIER</strong><br>Marcory Zone 4 — Abidjan</p>
          </div>
        </div>
      `,
    });

    // Track send
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('receipt_sends').insert({
      receipt_id: receiptId,
      channel: 'email',
      recipient: receipt.client_email,
      sent_by: user?.id,
    });

    return NextResponse.json({ success: true, id: emailResult.data?.id });
  } catch (err) {
    console.error('Email send error:', err);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 });
  }
}
