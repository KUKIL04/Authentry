import crypto from 'crypto';

export class WebhookModule {
  constructor(private signingSecret: string) {}

  /**
   * Cryptographically verifies that the webhook originated from AuthEntry
   */
  verifySignature(payloadString: string, signatureHeader: string): boolean {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
    
    const hmac = crypto.createHmac('sha256', this.signingSecret);
    const expectedSignature = `sha256=${hmac.update(payloadString).digest('hex')}`;
    
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Express Middleware helper for clients to mount the webhook receiver effortlessly.
   */
  expressHandler(onEvent: (event: string, data: any) => Promise<void> | void) {
    return async(req: any, res: any) => {
      console.log('📥 [Sandbox SDK] Webhook hit the Express endpoint!');
      try {
        // FIX 1: Safely handle Buffer objects from express.raw()
        let rawBody: string;
        if (Buffer.isBuffer(req.body)) {
          rawBody = req.body.toString('utf8');
        } else if (typeof req.body === 'string') {
          rawBody = req.body;
        } else {
          rawBody = JSON.stringify(req.body);
        }

        const signature = req.headers['x-signature'] as string;

        if (!this.verifySignature(rawBody, signature)) {
          console.error('❌ [Sandbox SDK] Signature Verification Failed!');
          return res.status(401).json({ error: 'Invalid Webhook Signature' });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.event || payload.type;

        console.log(`✅ [Sandbox SDK] Signature Verified. Triggering Event: ${eventName}`);
        
        // Fire the developer's callback
        await onEvent(eventName, payload.data);

        // Instantly acknowledge receipt so BullMQ marks it SUCCESS
        return res.status(200).send('OK');
      } catch (err: any) {
        console.error("❌ [Sandbox Webhook Crash]:", err.message || err);
        return res.status(500).json({ error: 'Webhook processing failed' });
      }
    };
  }
}