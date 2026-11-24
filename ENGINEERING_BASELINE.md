# PS1 AI Engineer — Engineering Baseline

## Product decisions approved by the owner
- Initial scope: PS1 only; architecture may allow later expansion.
- Primary user: one engineer/operator (single-user workflow initially).
- Delivery targets: responsive web app and Android APK.
- AI approach: hybrid cloud + local, with cloud AI requiring connectivity and a configured provider key.
- Product scope: engineering assistant plus daily operations follow-up.
- Notifications: Android phone only; configurable per category. Reading reminders follow a user-defined schedule, not a hard-coded two-hour schedule.
- AI-generated advice is advisory only. The app must never issue control commands to pumps, valves, turbines, DCS/SCADA, trips, interlocks, or protection systems.

## Source-of-truth hierarchy
1. `111PS1_Technical_Guide.docx` supplied by the owner is the primary technical authority.
2. The process flow diagram and existing repository are secondary references.
3. General engineering knowledge may explain concepts, but must not silently override the guide.
4. When the guide is internally inconsistent or silent, mark the item unresolved/undocumented. Do not invent a value or silently reconcile it.

## Verified statements in the technical guide
- The station has ten floating-roof crude-oil tanks: K1–K4, R1–R4, B1–B2.
- Tank levels are recorded every two hours; turbine-unit readings are recorded every three hours.
- The level-to-volume coefficient is 43 m³ per cm for all ten tanks.
- Bottom bulge correction is 600 m³ per tank and applies to all ten tanks.
- Out-of-service tanks are excluded from calculations; isolated tanks containing crude oil remain included.
- Operating capacity is described as 76,000 m³ for an ordinary tank and 70,000 m³ for a safety tank; free volume is operating capacity of in-service tanks minus actual stock.
- Conversion: 1 m³ = 6.2898 barrels.
- Balance check: total receipt − total pumping = change in stock.
- Receipt includes external-station receipts and transfers into PS1; pumping includes port, strategic-pipeline and transfers out of PS1.

## Source conflict register — must be resolved before production calculations
| ID | Guide / repository discrepancy | Required treatment |
|---|---|---|
| CALC-01 | Guide page 29 says dead stock is 1,000 m³ per tank. Its page 30 seven-tank worked example subtracts 70,000 m³. Existing code uses a fixed 70,000 m³ plus 10,000 m³ for each extra tank. | Do not select one interpretation silently. Keep this calculation flagged pending an owner-approved clarification. |
| CALC-02 | Guide page 29 defines free volume from the sum of operating capacities of tanks in service (76,000 ordinary / 70,000 safety). Its page 30 seven-tank example uses 514,000 m³. Existing code uses a fixed 514,000 m³ base plus 76,000 m³ per extra tank. | Do not treat the fixed base as authoritative. Model tank service status and tank class only after the tank-class mapping and worked-example assumptions are confirmed. |
| CALC-03 | Guide says 600 m³ bottom correction applies to all tanks; existing code subtracts 600 m³ only for tanks with a non-null reading. | Preserve raw readings and expose the applied tank count/correction in the calculation audit; confirm treatment of blank/out-of-service tanks before changing production logic. |
| OCR-01 | Existing Gemini image-analysis route rounds every extracted tank level to the nearest 10 cm. | Remove silent rounding in a future code change; retain raw precision, confidence/provenance where available, and require human review before saving. |
| PRIV-01 | Existing chat route appends request bodies and AI responses to `debug_chat.log`. | Do not log chat contents, operational context, image payloads, credentials, or full stack traces in production. Use minimal redacted operational logs. |

## Safety and data-integrity requirements
- Never convert an AI inference or app calculation into an official process alarm.
- Never connect this application to control or protection equipment.
- Never recommend bypassing alarms, interlocks, trips, permits, isolation, LOTO, PPE, or approved procedures.
- Any OCR-extracted measurement must be visibly marked as AI-extracted and reviewed by the user before it changes an operational record.
- Keep original input, timestamp, user correction, and audit history for operational readings.
- Show calculation inputs, units, formula version, excluded/in-service tanks, and warnings beside calculated results.
- Offline mode may support local records and calculations. Cloud AI features must clearly show when internet/provider access is unavailable.
- Notifications must be configurable by category and respect user-selected schedules and quiet hours.

## Delivery status
This document records the engineering baseline and known issues. It does not claim that the application has been built, tested, certified, or approved for operational use.
