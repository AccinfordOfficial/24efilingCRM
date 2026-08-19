// Setup Deno Deploy Serves
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'my_secure_whatsapp_token_123';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Webhook Verification for Meta Cloud API (GET request)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully!');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Verification failed.', { status: 403 });
  }

  // 2. Inbound Messages Event Notification (POST request)
  if (req.method === 'POST') {
    try {
      const payload = await req.json();
      console.log('Incoming WhatsApp event payload:', JSON.stringify(payload));

      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value || !value.messages) {
        return new Response(JSON.stringify({ status: 'ignored' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const messageObj = value.messages[0];
      const contactObj = value.contacts?.[0];

      const fromPhone = messageObj.from; // e.g. "919876543210"
      const customerName = contactObj?.profile?.name || 'WhatsApp Client';
      const messageContent = messageObj.text?.body || '';
      const whatsappMessageId = messageObj.id;

      if (messageContent) {
        // Find or create WhatsApp Conversation
        const { data: conversation, error: convError } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('customer_phone', fromPhone)
          .maybeSingle();

        if (convError) throw convError;

        if (!conversation) {
          // Attempt to find matching customer
          const { data: matchedCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', fromPhone)
            .maybeSingle();

          const { data: newConv, error: createError } = await supabase
            .from('whatsapp_conversations')
            .insert([{
              customer_phone: fromPhone,
              customer_name: customerName,
              customer_id: matchedCustomer?.id || null,
              unread_count: 1,
              status: 'active'
            }])
            .select()
            .single();

          if (createError) throw createError;
          conversation = newConv;
        } else {
          // Update conversation timestamp
          await supabase
            .from('whatsapp_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              unread_count: conversation.unread_count + 1
            })
            .eq('id', conversation.id);
        }

        // Insert message record
        const { error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert([{
            conversation_id: conversation.id,
            direction: 'inbound',
            content: messageContent,
            message_type: 'text',
            whatsapp_message_id: whatsappMessageId,
            status: 'delivered'
          }]);

        if (msgError) throw msgError;

        // Auto-intake parser: If customer states "work order" or "service input"
        if (messageContent.toLowerCase().includes('work order') || messageContent.toLowerCase().includes('service')) {
          // Auto create work order record
          await supabase
            .from('work_orders')
            .insert([{
              customer_id: conversation.customer_id || null,
              customer_name: conversation.customer_name || customerName,
              customer_phone: fromPhone,
              description: `WhatsApp Bot Intake: ${messageContent}`,
              priority: 'normal',
              status: 'accepted',
              source: 'whatsapp'
            }]);
        }
      }

      return new Response(JSON.stringify({ status: 'success' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      console.error('Webhook error:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Not Found', { status: 404 });
});
