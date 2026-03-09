# AI Integration Plan for YASH EstiPro

## Status: PENDING USER DECISION — Saved for future reference

## Proposed AI Features (User to pick 1-2)
- **a.** AI Estimation Suggestions (from historical project data)
- **b.** Smart Cost Optimization recommendations
- **c.** Natural Language Project Builder (chat-to-estimate)
- **d.** AI Proposal/Summary Generator
- **e.** Risk & Deviation Analyzer

## Technical Approach
- No separate server needed — integrates into existing FastAPI backend
- Backend makes API calls to AI provider (server-side only)
- Minimal code: new endpoints in server.py + new UI components

## Recommended Model
- **Start with**: Gemini 3 Flash (~$0.50-$1/month for 100 estimations)
- **Upgrade path**: GPT-5.2 for more sophisticated reasoning
- **Key**: Emergent Universal Key (no external API keys needed)

## Cost Estimates (per 100 estimations/month)
- Gemini Flash: ~$0.50 - $1/month
- GPT-5.2: ~$5 - $15/month

## Security Notes
- AI calls server-side only (no client-side key exposure)
- Send only necessary project data, never credentials or PII

## Date Saved: March 2026
