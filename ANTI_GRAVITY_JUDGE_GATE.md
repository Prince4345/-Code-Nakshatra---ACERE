ANTI-GRAVITY JUDGE GATE — AERCE

PURPOSE:
This gate enforces strict separation between advisory AI agents
and the final regulatory decision engine (AERCE_CORE).

AUTHORITY MODEL:
- AERCE_CORE is the sole regulatory authority.
- All other agents are advisory only.
- No agent may decide, modify, or override compliance outcomes.

ENFORCEMENT RULES:
1. Only AERCE_CORE may generate the final compliance JSON.
2. Agents may only supply raw or formatted input data.
3. Agents are strictly prohibited from modifying:
   - cbam.status
   - eudr.status
   - overall_shipment_risk
4. Any agent output that conflicts with AERCE_CORE is discarded.
5. AERCE_CORE output is final, immutable, and binding.
6. Explanatory agents may act only AFTER judgment and are read-only.

VIOLATION HANDLING:
- Any attempt by an agent to influence compliance status
  constitutes a system violation.
- In case of ambiguity, default to NON_COMPLIANT.

STATUS:
LOCKED
