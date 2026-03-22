from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import base64
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class EmailRequest(BaseModel):
    to: List[str]
    cc: Optional[List[str]] = []
    bcc: Optional[List[str]] = []
    subject: str
    message: str
    attachment: Optional[str] = None  # Base64 encoded PDF string

def send_email_task(email_data: EmailRequest):
    try:
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        
        if not smtp_user or not smtp_password:
            logger.error("SMTP_USER or SMTP_PASSWORD not found in environment variables. Cannot send email.")
            return

        sender_email = smtp_user
        
        # Create message container
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = ", ".join(email_data.to)
        msg['Subject'] = email_data.subject
        
        if email_data.cc:
            msg['Cc'] = ", ".join(email_data.cc)

        # Attach message body
        html_body = f"<div style='font-family: Arial, sans-serif; white-space: pre-line;'>{email_data.message}</div>"
        msg.attach(MIMEText(html_body, 'html'))
        
        # Handle PDF attachment
        if email_data.attachment:
            try:
                # Remove data URI prefix if present (e.g. data:application/pdf;base64,)
                base64_data = email_data.attachment
                if ',' in base64_data:
                    base64_data = base64_data.split(',')[1]
                
                pdf_bytes = base64.b64decode(base64_data)
                
                part = MIMEBase('application', 'pdf')
                part.set_payload(pdf_bytes)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', 'attachment; filename="Project_Dashboard_Report.pdf"')
                msg.attach(part)
                logger.info("PDF attachment successfully added.")
            except Exception as attachment_err:
                logger.error(f"Failed to process PDF attachment: {str(attachment_err)}")
        
        # Build recipients list for the sendmail command
        all_recipients = email_data.to + (email_data.cc or []) + (email_data.bcc or [])

        # Connect to Gmail SMTP
        logger.info("Connecting to smtp.gmail.com:587")
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(smtp_user, smtp_password)
        
        # Send
        server.sendmail(sender_email, all_recipients, msg.as_string())
        server.quit()
        logger.info("Email sent successfully via Gmail SMTP.")

    except Exception as e:
        logger.error(f"Failed to send email via SMTP: {str(e)}")


@router.post("/send")
async def send_email(email_data: EmailRequest, background_tasks: BackgroundTasks):
    """
    Send an email using Gmail SMTP.
    To avoid blocking the request, sending is done in the background.
    """
    if not email_data.to:
        raise HTTPException(status_code=400, detail="At least one recipient (to) is required.")

    # Always return success immediately, actual sending runs in background
    background_tasks.add_task(send_email_task, email_data)
    
    return {"status": "success", "message": "Email has been queued for sending."}
