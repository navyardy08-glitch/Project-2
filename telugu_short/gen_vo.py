#!/usr/bin/env python3
"""gen_vo.py: generate the remaining voice lines with the ElevenLabs TTS API (key injected by the proxy)."""
import json, sys, subprocess, os
V = {"narr": "byBvnAtc0165IHbm4c7a", "atta": "AfGQOwNTk8JotVVaad3o", "kodalu": "oyjIr5XAhIyRjfNq6spl", "koduku": "ge94MQm6fYaUCnxz1us6", "mama": "EohubqvAiTiSkWCp1vu7"}
LINES = [
    ("02_atta", "atta", "[strict] ఇదిగో, చెప్పింది విను. పాలు పొంగకుండా చూసుకో. మామయ్యకి టైముకి మాత్ర వేయి. తులసి చెట్టుకి నీళ్ళు పోయడం మర్చిపోకు!"),
    ("03_kodalu", "kodalu", "[sweetly] అయ్యో అత్తయ్యా, నేను చూసుకుంటా కదా. మీరు హాయిగా వెళ్ళి రండి!"),
    ("04_narr", "narr", "బస్సు అలా కదిలిందో లేదో... కోడలు మనసులో, [mischievously] \"హమ్మయ్య! ఈ వారం ఇల్లు నాదే!\""),
    ("05_narr", "narr", "[happy] ఫస్ట్ డే... తొమ్మిదింటి దాకా నిద్ర. వంటా? ఏం లేదు, మ్యాగీ చాలు. రిమోట్ కూడా తన చేతిలోనే!"),
    ("06_narr", "narr", "కానీ సెకండ్ డే... [fast] పాలు పొంగిపోయాయి. కుక్కర్ ఎన్ని విజిల్సో లెక్కే మర్చిపోయింది. పప్పు మొత్తం మాడిపోయింది."),
    ("07_mama", "mama", "[elderly voice] అమ్మాయ్... నా బీపీ మాత్ర ఎక్కడ పెట్టావమ్మా?"),
    ("09_narr", "narr", "తులసి చెట్టు వాడిపోయింది. ఇల్లంతా చిందరవందర."),
    ("10_kodalu", "kodalu", "[crying] అత్తయ్యా... ఎప్పుడొస్తారు? నా వల్ల కావట్లేదు..."),
    ("12_atta", "atta", "[warmly] నాకు తెలుసే... నువ్వు రెండు రోజులు కూడా ఉండలేవని. అందుకే మధ్యలోనే వచ్చేశా."),
    ("13_narr", "narr", "[softly] కానీ అసలు సంగతి ఏంటంటే... అక్కడ అత్తయ్యకి కూడా రెండు రాత్రులు నిద్ర పట్టలేదు. \"మా కోడలు ఎలా ఉందో ఏమో\" అని ఒకటే బెంగ."),
    ("14_narr", "narr", "[warmly] ఆ రాత్రి అత్తా కోడలూ కలిసి వంట చేశారు. ఈసారి పప్పు మాడలేదు. ఇల్లు ఒక్కరితో నడవదండి... అందరూ కలిస్తేనే అది ఇల్లు."),
]
model = sys.argv[1] if len(sys.argv) > 1 else "eleven_v3"
only = sys.argv[2:]  # optional subset of names
for name, who, text in LINES:
    if only and name not in only: continue
    out = f"{name}.mp3"
    if os.path.exists(out) and os.path.getsize(out) > 2000: continue
    body = json.dumps({"text": text, "model_id": model})
    r = subprocess.run(["curl", "-sS", "-o", out, "-w", "%{http_code}", "-X", "POST",
        f"https://api.elevenlabs.io/v1/text-to-speech/{V[who]}?output_format=mp3_44100_128",
        "-H", "xi-api-key: proxy-injected", "-H", "Content-Type: application/json", "-d", body], capture_output=True, text=True)
    code = r.stdout.strip()
    if code != "200":
        print(name, "FAILED", code, open(out, errors="replace").read()[:300]); os.remove(out); continue
    print(name, "ok")
