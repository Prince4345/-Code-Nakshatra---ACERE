AERCE SAFE FAILURE MODES

If any of the following occur:
- Agent crash
- Partial input
- Pipeline interruption
- Contract violation
- Ambiguous regulatory applicability

System MUST:
- Fail CLOSED
- Mark shipment as NON_COMPLIANT
- Set overall_shipment_risk = HIGH
- Log failure reason

AERCE must never fail OPEN.
