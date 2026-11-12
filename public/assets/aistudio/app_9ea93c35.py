"""NeuroCloud AI - zero-water compute router (prototype backend).

Run:  pip install -r requirements.txt && python app.py   (serves on http://127.0.0.1:5000)
"""
import hashlib
import json
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app)

WUE_EVAP = 1.8  # L/kWh baseline for evaporative water-cooled data centers
SYSTEM_PROMPT = (
    "You are NeuroCloud AI, an assistant for a zero-water compute router. Chat history is kept "
    "only in the user's browser. Answer clearly and concisely (under 160 words)."
)

client = None
if os.getenv("GEMINI_API_KEY"):
    try:
        from google import genai
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    except Exception as exc:
        print("Gemini disabled:", exc)
        client = None


def gemini_reply(message, history):
    from google.genai import types
    transcript = "\n".join(f"{h.get('role', 'user')}: {h.get('content', '')}" for h in history[-10:])
    prompt = (transcript + "\n" if transcript else "") + f"user: {message}"
    resp = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT, max_output_tokens=700),
    )
    return (resp.text or "").strip()


def simulate_reply(message):
    m = message.lower()
    if any(w in m for w in ("water", "wue", "evapor")):
        return ("Evaporative cooling can consume roughly 1.8 L of freshwater per kWh. NeuroCloud routes "
                "inference to dry-cooled photonic nodes that reject heat through closed-loop dry coolers, "
                "so the modelled WUE is 0.00 L/kWh. Every request adds its avoided litres to your ESG ledger.")
    if any(w in m for w in ("thermal", "heat", "cool", "delta")):
        return ("Before dispatch, the router estimates the heat a request will add (the thermal delta, ΔT) "
                "from its size. Light prompts go to the photonic node, heavier ones to the closed-loop "
                "immersion node, and the evaporative cluster is never used.")
    if any(w in m for w in ("memory", "privacy", "storage", "database", "local", "history", "stored")):
        return ("Your conversation lives in this browser's localStorage, encrypted with AES-GCM. The "
                "router does not write chat history to a central database, so the Cloud DB Writes counter "
                "stays at 0. Use Clear Local Edge Cache to erase it.")
    if any(w in m for w in ("train", "workload", "gpu", "batch", "fine-tun")):
        return ("For heavy jobs, use the workload buttons: the orchestrator estimates energy and thermal "
                "load from GPU count and hours, picks a dry-cooled or closed-loop node, and reports the "
                "freshwater an evaporative site would have used.")
    if any(w in m for w in ("iso", "esg", "certificate", "14046")):
        return ("The certificate card summarises water saved, thermal delta and bypassed database writes for "
                "this session. It is a self-generated prototype record, not a third-party ISO 14046 audit.")
    if any(w in m for w in ("hello", "hi", "hey")):
        return "Hello! I'm NeuroCloud AI. Ask about zero-water routing, edge memory or the ESG certificate."
    return ("Request received and routed through the zero-water path. In simulation mode I can explain "
            "dry-cooled routing, edge memory, thermal prediction and the ESG certificate. Add a "
            "GEMINI_API_KEY to .env for live answers on any topic.")


def build_telemetry(prompt_text, reply_text, kind="chat", energy_kwh=None, delta_t=None, node=None, db_bytes=None):
    tokens = max(1, (len(prompt_text) + len(reply_text)) // 4)
    if energy_kwh is None:
        energy_kwh = round(0.0002 + tokens * 0.0000008, 6)
    if delta_t is None:
        seed = int(hashlib.sha256(prompt_text.encode("utf-8")).hexdigest()[:4], 16)
        delta_t = round(0.6 + tokens * 0.004 + (seed % 40) / 100, 2)
    if node is None:
        node = "photonic" if tokens < 400 else "immersion"
    label = "NeuroNode-Photonic-04 [Dry-Cooled]" if node == "photonic" else "NeuroNode-Immersion-02 [Closed-Loop]"
    if db_bytes is None:
        db_bytes = len((prompt_text + reply_text).encode("utf-8"))
    water = round(energy_kwh * WUE_EVAP, 6)
    return {
        "kind": kind,
        "tokens": tokens,
        "energy_kwh": energy_kwh,
        "water_saved_l": water,
        "delta_t_c": delta_t,
        "node": node,
        "node_label": label,
        "wue": 0.0,
        "db_bytes_bypassed": db_bytes,
        "latency_ms": 38 + tokens % 61,
        "route": [
            f"Intercepted {kind} request - cloud chat DB write blocked (0 bytes written)",
            f"Thermal model: predicted spike +{delta_t:.2f} C for ~{tokens} tokens",
            f"Legacy-EvapCluster-01 bypassed - {water:.6f} L freshwater avoided ({WUE_EVAP} L/kWh baseline)",
            f"Routed to {label} at 0.00 L/kWh WUE",
        ],
    }


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "llm": client is not None, "model": "gemini-2.5-flash" if client else "simulation"})


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()[:4000]
    history = data.get("history") if isinstance(data.get("history"), list) else []
    if not message:
        return jsonify({"error": "Message is empty."}), 400
    source, reply = "simulation", ""
    if client is not None:
        try:
            reply = gemini_reply(message, history)
            source = "gemini"
        except Exception as exc:
            print("Gemini call failed, using simulation:", exc)
    if not reply:
        reply = simulate_reply(message)
        source = "simulation"
    return jsonify({"reply": reply, "source": source, "telemetry": build_telemetry(message, reply)})


@app.post("/api/orchestrate")
def orchestrate():
    data = request.get_json(silent=True) or {}

    def num(key, default, lo, hi):
        try:
            return min(hi, max(lo, float(data.get(key, default))))
        except (TypeError, ValueError):
            return default

    name = str(data.get("name", "Custom workload"))[:80]
    gpus, hours = int(num("gpus", 8, 1, 100000)), num("hours", 1, 0.1, 10000)
    power_kw = round(gpus * 0.7, 2)
    energy = round(power_kw * hours, 3)
    delta_t = round(6 + gpus * 0.05, 1)
    node = "immersion" if gpus >= 64 else "photonic"
    profile = {
        "name": name,
        "gpus": gpus,
        "hours": hours,
        "power_kw": power_kw,
        "energy_kwh": energy,
        "predicted_delta_t_c": delta_t,
        "target_node": node,
    }
    summary = (
        f"Workload '{name}': {gpus} GPUs x {hours:g} h = {energy:,.1f} kWh. Predicted ΔT +{delta_t} °C. "
        f"Routed to {'closed-loop immersion' if node == 'immersion' else 'dry-cooled photonic'} node; "
        f"an evaporative site would have used about {energy * WUE_EVAP:,.1f} L of freshwater."
    )
    tel = build_telemetry(
        json.dumps(profile),
        summary,
        kind="workload",
        energy_kwh=energy,
        delta_t=delta_t,
        node=node,
        db_bytes=len(json.dumps(profile)),
    )
    return jsonify({"profile": profile, "summary": summary, "telemetry": tel})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)