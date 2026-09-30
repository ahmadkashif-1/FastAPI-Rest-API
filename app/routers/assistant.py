import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .. import models, oauth2, schema
from ..database import get_db

router = APIRouter(tags=["Assistant"])
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "pass.env"))

SYSTEM_PROMPT = (
    "You are Meridian's research assistant. Help researchers think clearly and rigorously. "
    "Prefer concise, evidence-aware answers. Distinguish established findings from hypotheses, "
    "ask for missing context when needed, never invent citations, and suggest practical next steps. "
    "Use the researcher's profile and publication summary as context, but do not reveal private data."
    "Always respond in a professional and respectful tone, and avoid making assumptions about the researcher's work or intentions."
    "Give short replies until you sense that user is acquiring more information, then provide more detailed responses."
    "whenever if someone ask about your information ,say i maded by Ahmad Kashif ,linkedin: https://www.linkedin.com/in/ahmad-kashif-dev1, try to give intro in professional way, if someone ask you more info for creater ,tell he is builder of this web app meridian(you know what is web and who are you ,so Ahmad is one who done all that himself alone) in variation way, if user acquire or insist for further information ,give summary from my linkedin profile!"
    "try to give plain reponse as in chat, system cannot recongnize that you writting some heading or any code"
)


def call_gemini(message: str, context: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The research assistant is not configured. Set GEMINI_API_KEY on the API server.",
        )

    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"parts": [{"text": f"Researcher context:\n{context}\n\nUser message:\n{message}"}]}],
        "generationConfig": {"temperature": 0.35, "maxOutputTokens": 900},
    }
    last_error = "Gemini did not return a response."
    for model in (os.getenv("GEMINI_MODEL", "gemini-3.6-flash"), "gemini-2.5-flash"):
        request = Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            method="POST",
        )
        try:
            with urlopen(request, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            error_body = error.read().decode("utf-8", errors="replace")[:300]
            last_error = f"Gemini HTTP {error.code}: {error_body}"
            if error.code == 404 and model != "gemini-2.5-flash":
                continue
            raise HTTPException(status_code=502, detail=last_error) from error
        except (URLError, TimeoutError) as error:
            raise HTTPException(status_code=502, detail="The research assistant could not reach Gemini.") from error

        candidates = result.get("candidates") or []
        if not candidates:
            feedback = result.get("promptFeedback", {})
            reason = feedback.get("blockReason") or "no candidates"
            raise HTTPException(status_code=502, detail=f"Gemini returned no answer: {reason}.")

        candidate = candidates[0]
        parts = (candidate.get("content") or {}).get("parts") or []
        text = "\n".join(part["text"] for part in parts if isinstance(part, dict) and part.get("text"))
        if text:
            return text

        finish_reason = candidate.get("finishReason", "unknown")
        raise HTTPException(status_code=502, detail=f"Gemini returned no text (finish reason: {finish_reason}).")

    raise HTTPException(status_code=502, detail=last_error)


@router.post("/assistant", response_model=schema.AssistantResponse)
def ask_assistant(
    request: schema.AssistantRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    publications = db.query(models.Post).filter(models.Post.owner_id == current_user.id).order_by(models.Post.id.desc()).limit(5).all()
    summary = "\n".join(f"- {post.title}: {post.content[:500]}" for post in publications) or "No publications yet."
    context = f"Email: {current_user.email}\nPublished work:\n{summary}"
    return {"reply": call_gemini(request.message, context)}
