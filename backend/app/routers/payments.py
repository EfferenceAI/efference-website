"""
Payment webhook router for handling Stripe events.
"""
from fastapi import APIRouter, Request, HTTPException
from app.services.email import send_email
from app.config import settings
import stripe
import json

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe secret key not configured")
    
    # Initialize Stripe with secret key
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle different payment events
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = session['customer_details']['email']
        
        # Check if payment was actually successful
        if session['payment_status'] != 'paid':
            print(f"Payment not completed for {customer_email}, status: {session['payment_status']}")
            return {"status": "payment_not_completed"}
        
        # Only send success email if payment is confirmed paid
        
        # Retrieve full session with line items to get quantity
        full_session = stripe.checkout.Session.retrieve(
            session['id'],
            expand=['line_items']
        )
        
        # Get payment details from Stripe session
        customer_name = session['customer_details']['name'] or customer_email.split('@')[0]
        amount_paid = f"${session['amount_total'] / 100:.2f}"
        
        # Get quantity from expanded line items
        line_items = full_session.line_items.data
        quantity = line_items[0].quantity if line_items else 1
        
        # Send pre-order confirmation email
        subject = "Pre-Order Confirmation – Efference H-01"
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://efference.ai/images/camera.png" alt="Efference H-01" style="max-width: 400px; width: 100%; height: auto;">
            </div>
            <p>Hi {customer_name},</p>
            
            <p>We're excited to confirm your pre-order of the <strong>Efference H-01</strong>. We have successfully received your payment of <strong>{amount_paid}</strong>, and we'll be shipping <strong>{quantity} unit{'s' if quantity > 1 else ''}</strong> to you in <strong>March</strong>.</p>
            
            <p>You are now part of a small group of early customers who will shape the future of this product.</p>
            
            <p>In the next few days, you'll receive a personal email from our CEO, <strong>Gianluca Bencomo</strong> (gianluca@efference.ai). He is speaking 1:1 with every pre-order customer to understand:</p>
            <ul>
                <li>what you're building,</li>
                <li>what features matter most,</li>
                <li>and how we can make the H-01 deliver the most value for your workflow.</li>
            </ul>
            
            <p>Your feedback at this stage will directly influence the product! Thank you for believing in what we're building and we can't wait to ship your units.</p>
            
            <p>With appreciation,<br><strong>The Efference Team</strong></p>
        </div>
        """
        
        success = send_email(customer_email, subject, body)
        if success:
            print(f"Pre-order confirmation sent to {customer_email}")
        else:
            print(f"Failed to send confirmation email to {customer_email}")
    
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        customer_email = payment_intent.get('receipt_email', 'unknown')
        print(f"Payment failed for {customer_email}, reason: {payment_intent.get('last_payment_error', {}).get('message', 'Unknown')}")
        # Could send a payment failed email here if needed
    
    return {"status": "success"}